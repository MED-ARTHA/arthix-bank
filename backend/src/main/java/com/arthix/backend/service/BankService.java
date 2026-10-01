package com.arthix.backend.service;

import com.arthix.backend.dto.BankDtos.*;
import com.arthix.backend.entity.Transaction;
import com.arthix.backend.entity.User;
import com.arthix.backend.repository.TransactionRepository;
import com.arthix.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
public class BankService {

    private static final BigDecimal MAX_TRANSFER = new BigDecimal("50000.00");

    private static final List<ProviderDto> PROVIDERS = List.of(
        new ProviderDto("srm", "SRM (Eau & Electricite)", "BILLS"),
        new ProviderDto("telecom", "Telecom / Internet", "BILLS"),
        new ProviderDto("school-private", "Ecole privee", "SCHOOLS"),
        new ProviderDto("university", "Universite", "SCHOOLS")
    );

    private static final List<OfferDto> OFFERS = List.of(
        new OfferDto("Carte Arthix Classic", "Carte bancaire gratuite la premiere annee, avec controle total depuis l'application."),
        new OfferDto("Credit etudiant", "Financez vos etudes avec un taux preferentiel. Simulez votre mensualite en direct."),
        new OfferDto("Epargne Arthix+", "Un compte d'epargne avec un taux avantageux. Visualisez la croissance de votre capital."),
        new OfferDto("Paiement facilite", "Payez vos factures en un clic, sans frais, avec recu instantane."),
        new OfferDto("Change multi-devises", "Convertissez vos MAD en EUR, USD, GBP ou CHF au meilleur taux."),
        new OfferDto("Cashback factures", "Recevez 1% de cashback sur vos paiements de factures et frais de scolarite.")
    );

    private final UserRepository users;
    private final TransactionRepository txs;

    public BankService(UserRepository users, TransactionRepository txs) {
        this.users = users;
        this.txs = txs;
    }

    public List<ProviderDto> providers() { return PROVIDERS; }

    public List<OfferDto> offers() { return OFFERS; }

    @Transactional(readOnly = true)
    public List<TransactionDto> transactions(String email) {
        User u = users.findByEmail(email).orElseThrow();
        return txs.findTop50ByUserOrderByCreatedAtDesc(u).stream().map(TxMapper::toDto).toList();
    }

    @Transactional
    public TransactionDto pay(String email, PaymentRequest req) {
        ProviderDto p = PROVIDERS.stream()
            .filter(x -> x.id().equals(req.provider()))
            .findFirst()
            .orElseThrow(() -> bad("Unknown provider"));

        User u = users.findByEmailForUpdate(email).orElseThrow();

        if (u.getBalance().compareTo(req.amount()) < 0) {
            throw bad("Insufficient balance");
        }

        u.setBalance(u.getBalance().subtract(req.amount()));
        Transaction t = txs.save(new Transaction(
            u, p.category(), p.name(), req.reference().trim(), req.amount(), u.getBalance()));
        return TxMapper.toDto(t);
    }

    @Transactional(readOnly = true)
    public RecipientDto lookup(String email, String account) {
        String acc = normalize(account);
        String mine = users.findAccountNumberByEmail(email).orElse(null);
        if (acc.equals(mine)) throw bad("This is your own account");
        User u = users.findByAccountNumber(acc).orElseThrow(BankService::noAccount);
        return new RecipientDto(mask(u.getFullName()), u.getAccountNumber());
    }

    @Transactional
    public TransactionDto transfer(String email, TransferRequest req) {
        String sa = users.findAccountNumberByEmail(email)
            .orElseThrow(() -> bad("Your account has no number yet"));
        String ra = normalize(req.toAccount());
        BigDecimal amount = req.amount();

        if (sa.equals(ra)) throw bad("You cannot transfer to your own account");
        if (amount.compareTo(MAX_TRANSFER) > 0) throw bad("Maximum per transfer is 50 000 MAD");

        User sender;
        User recipient;
        if (sa.compareTo(ra) < 0) {
            sender = users.findWithLockByAccountNumber(sa).orElseThrow();
            recipient = users.findWithLockByAccountNumber(ra).orElseThrow(BankService::noAccount);
        } else {
            recipient = users.findWithLockByAccountNumber(ra).orElseThrow(BankService::noAccount);
            sender = users.findWithLockByAccountNumber(sa).orElseThrow();
        }

        if (sender.getBalance().compareTo(amount) < 0) throw bad("Insufficient balance");

        sender.setBalance(sender.getBalance().subtract(amount));
        recipient.setBalance(recipient.getBalance().add(amount));

        String ref = "TRF-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
        Transaction out = txs.save(Transaction.transfer(
            sender, true, recipient, amount, sender.getBalance(), req.note(), ref));
        txs.save(Transaction.transfer(
            recipient, false, sender, amount, recipient.getBalance(), req.note(), ref));
        return TxMapper.toDto(out);
    }

    private static String normalize(String s) {
        return s == null ? "" : s.replaceAll("\\s+", "").toUpperCase();
    }

    private static String mask(String full) {
        String[] p = full.trim().split("\\s+");
        if (p.length == 1) return p[0];
        return p[0] + " " + p[p.length - 1].charAt(0) + ".";
    }

    private static ResponseStatusException bad(String msg) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, msg);
    }

    private static ResponseStatusException noAccount() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Beneficiary account not found");
    }
}
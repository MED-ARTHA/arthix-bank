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

import java.util.List;

@Service
public class BankService {

    private static final List<ProviderDto> PROVIDERS = List.of(
        new ProviderDto("srm", "SRM (Eau & Electricite)", "BILLS"),
        new ProviderDto("telecom", "Telecom / Internet", "BILLS"),
        new ProviderDto("school-private", "Ecole privee", "SCHOOLS"),
        new ProviderDto("university", "Universite", "SCHOOLS")
    );

    private static final List<OfferDto> OFFERS = List.of(
        new OfferDto("Carte Arthix Classic", "Carte bancaire gratuite la premiere annee."),
        new OfferDto("Credit etudiant", "Financez vos etudes avec un taux preferentiel."),
        new OfferDto("Epargne Arthix+", "Un compte d'epargne avec un taux avantageux."),
        new OfferDto("Paiement facilite", "Payez vos factures en un clic, sans frais.")
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
        return txs.findTop50ByUserOrderByCreatedAtDesc(u).stream().map(this::toDto).toList();
    }

    @Transactional
    public TransactionDto pay(String email, PaymentRequest req) {
        ProviderDto p = PROVIDERS.stream()
            .filter(x -> x.id().equals(req.provider()))
            .findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown provider"));

        User u = users.findByEmailForUpdate(email).orElseThrow();

        if (u.getBalance().compareTo(req.amount()) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Insufficient balance");
        }

        u.setBalance(u.getBalance().subtract(req.amount()));
        Transaction t = txs.save(new Transaction(
            u, p.category(), p.name(), req.reference().trim(), req.amount(), u.getBalance()));
        return toDto(t);
    }

    private TransactionDto toDto(Transaction t) {
        return new TransactionDto(t.getId(), t.getCategory(), t.getLabel(), t.getReference(),
            t.getAmount(), t.getBalanceAfter(), t.getCreatedAt());
    }
}
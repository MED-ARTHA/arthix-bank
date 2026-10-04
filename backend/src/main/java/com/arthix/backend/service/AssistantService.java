package com.arthix.backend.service;

import com.arthix.backend.repository.UserRepository;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.text.Normalizer;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/** Answers questions about Arthix from the database (assistant_faq) and from the user's own data. No external API. */
@Service
public class AssistantService {

    public record Msg(String role, String content) {}

    private record Faq(String question, List<String> kw, String en, String fr, String dr) {}

    private static final int MAX_PER_MINUTE = 20;
    private static final int MIN_SCORE = 4;

    private static final Set<String> GREET = Set.of("hi", "hello", "hey", "salam", "slm", "bonjour", "salut", "hola");
    private static final Set<String> FR = Set.of("comment", "je", "est", "les", "des", "quoi", "puis", "peux", "frais",
        "merci", "mon", "ma", "pour", "combien", "quel", "quelle", "solde", "virement", "paiement", "faire", "bonjour", "salut");
    private static final Set<String> DR = Set.of("kifach", "kif", "chhal", "chno", "wach", "bghit", "bghiti", "3andi", "fin",
        "mnin", "dyal", "dyali", "flous", "flousi", "3la", "ila", "kayn", "kayna", "bach", "wla", "3afak", "salam", "slm",
        "khassni", "nzid", "n9der", "t9der", "3tini", "chkoun");

    private final JdbcTemplate jdbc;
    private final UserRepository users;
    private final MarketService market;
    private final Map<String, Deque<Long>> hits = new ConcurrentHashMap<>();

    public AssistantService(JdbcTemplate jdbc, UserRepository users, MarketService market) {
        this.jdbc = jdbc;
        this.users = users;
        this.market = market;
    }

    // ---------- schema + seed ----------

    @EventListener(ApplicationReadyEvent.class)
    public void init() {
        jdbc.execute("create table if not exists assistant_faq ("
            + "id bigserial primary key, topic varchar(40) not null, question varchar(200) not null, keywords text not null, "
            + "answer_en text not null, answer_fr text not null, answer_dr text not null)");
        jdbc.execute("create table if not exists assistant_unanswered ("
            + "id bigserial primary key, question varchar(300) not null, created_at timestamp not null default now())");
        Integer count = jdbc.queryForObject("select count(*) from assistant_faq", Integer.class);
        if (count != null && count > 0) return;

        faq("transfer", "How do transfers work?",
            "transfer,transfers,virement,virements,send money,envoyer,sift,tsift,sifti,tahwil",
            "Transfers are instant. Open Transfers, enter the recipient's ARX account number and the amount, then confirm.",
            "Les virements sont instantanés. Ouvrez Virements, saisissez le numéro de compte ARX du bénéficiaire et le montant, puis confirmez.",
            "Tahwil kaywsl f dqiqa. Dkhl l Transfers, 7ot raqm l-compte ARX dyal l-mostalim w l-mablagh, w akked.");
        faq("scheduled", "How do scheduled transfers work?",
            "scheduled transfer,scheduled,schedule,recurring,programme,planifie,permanent,jadwal,weekly,monthly,programmer",
            "In Scheduled you set a transfer to run once at a date you choose, every week, or every month. It runs automatically and you can cancel it any time.",
            "Dans Programmés, vous planifiez un virement une seule fois à la date choisie, chaque semaine ou chaque mois. Il s'exécute automatiquement et vous pouvez l'annuler à tout moment.",
            "F Scheduled katprogrammi tahwil: marra wa7da f nhar li bghiti, kol jem3a wla kol chhar. Kaykhdem b rasso w t9der tl8ih f ay wa9t.");
        faq("deposit", "How can I add money?",
            "add money,deposit,voucher,vouchers,recharge,depot,alimenter,zid flous,charger",
            "Add money supports a card deposit from 10 to 20 000 MAD, or a voucher from 50 to 10 000 MAD.",
            "Alimenter votre compte se fait par carte (de 10 à 20 000 MAD) ou par voucher (de 50 à 10 000 MAD).",
            "Bach tzid flous: b carte men 10 l 20 000 MAD, wla b voucher men 50 l 10 000 MAD.");
        faq("payments", "How do I pay a bill?",
            "pay,paying,bill,bills,facture,factures,paiement,payment,payments,receipt,recu,khalas,khallas,telecom,insurance,assurance,taxes",
            "Payments covers bills, telecom, schools, insurance, taxes and transport. After each payment you get a receipt you can print.",
            "Paiements couvre factures, télécom, écoles, assurances, impôts et transport. Après chaque paiement, vous recevez un reçu imprimable.",
            "F Payments t9der tkhlless l-fawatir, telecom, l-madaris, l-assurance, taxes w transport. Mn be3d kol khlass kayji recu t9der tprintih.");
        faq("goals", "How do savings goals work?",
            "goal,goals,saving,savings,epargne,objectif,objectifs,tawfir,twfir,economiser,hadaf",
            "Create a goal with a name and a target amount, then move money into it whenever you want. The progress bar shows how close you are.",
            "Créez un objectif avec un nom et un montant cible, puis versez de l'argent quand vous voulez. La barre de progression montre où vous en êtes.",
            "Dir objectif b smia w mablagh l-hadaf, w zid flous fih mnin bghiti. L-barre kat-werrik chhal bqa lik.");
        faq("invest", "What are the fees in Invest?",
            "invest,investment,investissement,portfolio,portefeuille,stock,fee,fees,frais,istithmar,tstathmar,smart portfolio,buy,sell",
            "In Invest you buy and sell simulated instruments from 50 MAD with a 0.2% fee. Smart portfolio builds one for you from a 4-question risk profile (Prudent, Balanced or Dynamic).",
            "Dans Invest, vous achetez et vendez des instruments simulés à partir de 50 MAD avec 0,2 % de frais. Le portefeuille Smart se construit à partir d'un profil de risque en 4 questions (Prudent, Équilibré ou Dynamique).",
            "F Invest katchri w katbi3 instruments simulés men 50 MAD b 0,2% dyal frais. Smart portfolio kaybni lik wa7ed men 4 as2ila 3la l-mokhatara (Prudent, Balanced wla Dynamic).");
        faq("chat", "How do messages work?",
            "message,messages,chat,photo,photos,video,videos,discussion,tchat,mssaj",
            "Messages is a real-time chat between Arthix accounts. You can send text, photos and videos.",
            "Messages est un chat en temps réel entre comptes Arthix. Vous pouvez envoyer du texte, des photos et des vidéos.",
            "Messages howa chat f l-wa9t l-7a9i9i bin l-comptes dyal Arthix. T9der tsift ktaba, tsawer w vidéos.");
        faq("tools", "What are Offers & tools?",
            "offers,offer,tools,loan,loans,credit,simulator,simulateur,pret,currency,devise,sarf,simulation",
            "Offers & tools has simulators for a loan, savings and currency exchange, so you can test numbers before deciding anything.",
            "Offres et outils propose des simulateurs de prêt, d'épargne et de change pour tester des chiffres avant de décider.",
            "F Offers & tools kayn simulateurs dyal l-qard, l-tawfir w sarf l-3omla, bach tjrreb l-arqam qbel ma tqrrer.");
        faq("profile", "How do I change my password or photo?",
            "password,mot de passe,mdp,kalimat sir,kelmat sir,profile,profil,security,securite,avatar",
            "Open Profile & security to change your photo, your name and your password.",
            "Ouvrez Profil et sécurité pour changer votre photo, votre nom et votre mot de passe.",
            "Ft7 Profile & security bach tbeddel tswira, smia w kalimat s-sir.");
        faq("history", "Where can I see my transactions?",
            "transactions,transaction,history,historique,activity,activite,amaliyat,mouvements",
            "Transactions lists every deposit, transfer and payment. Tap one to open its receipt.",
            "Transactions liste chaque dépôt, virement et paiement. Touchez-en un pour ouvrir son reçu.",
            "F Transactions kaybanou kol l-idafat, tawahil w khlassat. Dghat 3la wa7da bach tchouf l-recu.");
        faq("demo", "Is this real money?",
            "demo,fake,real money,argent reel,vrai argent,hqiqi,7a9i9i,real",
            "No. Arthix is a demo: balances, prices and the market are simulated.",
            "Non. Arthix est une démo : les soldes, les prix et le marché sont simulés.",
            "La. Arthix demo: l-flous, l-ath3ar w s-souq kolhom msna3in.");
        faq("help", "What can you help with?",
            "help,aide,3awn,3awni,features,what can you do,chno t9der,que peux tu faire",
            "I can explain transfers, scheduled transfers, payments, adding money, savings goals, messages, tools and Invest, and tell you your balance or the latest market news.",
            "Je peux expliquer les virements, virements programmés, paiements, dépôts, objectifs d'épargne, messages, outils et Invest, et vous donner votre solde ou les dernières actualités du marché.",
            "N9der nchre7 lik tahwil, scheduled, l-khlassat, zyadat l-flous, l-objectifs, messages, tools w Invest, w nwerrik solde dyalk wla akhir akhbar s-souq.");
    }

    private void faq(String topic, String q, String kw, String en, String fr, String dr) {
        jdbc.update("insert into assistant_faq(topic, question, keywords, answer_en, answer_fr, answer_dr) values (?,?,?,?,?,?)",
            topic, q, kw, en, fr, dr);
    }

    // ---------- answering ----------

    public String reply(String email, List<Msg> raw) {
        throttle(email);
        String q = lastUser(raw);
        if (q.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Empty message");

        String n = norm(q);
        String lang = detect(n);
        String[] tok = n.trim().split(" ");

        if (tok.length <= 3 && Arrays.stream(tok).anyMatch(GREET::contains)) {
            return t(lang, "Hi! Ask me about transfers, payments, savings goals, messages or Invest.",
                "Bonjour ! Posez-moi vos questions sur les virements, paiements, objectifs, messages ou Invest.",
                "Salam! Sewwelni 3la tahwil, l-khlassat, l-objectifs, messages wla Invest.");
        }

        if (anyHas(n, "balance", "solde", "chhal 3andi", "flousi", "how much do i have", "combien j ai")) {
            String bal = users.findByEmail(email).map(u -> String.valueOf(u.getBalance())).orElse(null);
            if (bal != null) {
                return t(lang, "Your available balance is " + bal + " MAD.",
                    "Votre solde disponible est de " + bal + " MAD.",
                    "L-solde dyalk daba howa " + bal + " MAD.");
            }
        }

        if (anyHas(n, "account number", "numero de compte", "raqm l compte", "raqm dyal", "iban", "rib")) {
            String acc = users.findByEmail(email).map(u -> u.getAccountNumber()).orElse(null);
            if (acc != null) {
                return t(lang, "Your account number is " + acc + ". Share it to receive transfers.",
                    "Votre numéro de compte est " + acc + ". Partagez-le pour recevoir des virements.",
                    "Raqm l-compte dyalk howa " + acc + ". 3tih l-nass bach ysiftou lik.");
            }
        }

        if (anyHas(n, "news", "event", "actualite", "akhbar", "khbar")) {
            List<MarketService.MarketEvent> ev = market.events();
            if (!ev.isEmpty()) {
                StringBuilder sb = new StringBuilder();
                ev.stream().limit(3).forEach(e -> sb.append("\n- ").append(e.headline())
                    .append(" (").append(e.impactPct() > 0 ? "+" : "").append(e.impactPct()).append("%)"));
                return t(lang, "Latest market events:", "Dernières actualités du marché :", "Akhir akhbar s-souq:") + sb;
            }
        }

        Faq best = null;
        int bestScore = 0;
        for (Faq f : faqs()) {
            int s = 0;
            for (String k : f.kw()) if (has(n, k)) s += k.length();
            if (s > bestScore) { bestScore = s; best = f; }
        }
        if (best != null && bestScore >= MIN_SCORE) {
            return "fr".equals(lang) ? best.fr() : "dr".equals(lang) ? best.dr() : best.en();
        }

        log(q);
        List<String> ideas = jdbc.queryForList("select question from assistant_faq order by random() limit 3", String.class);
        String list = String.join("\n- ", ideas);
        return t(lang, "I did not find an answer to that. Try asking:\n- " + list,
            "Je n'ai pas trouvé de réponse. Essayez :\n- " + list,
            "Ma l9it hta jawab. Jrreb tsewwel:\n- " + list);
    }

    private List<Faq> faqs() {
        return jdbc.query("select question, keywords, answer_en, answer_fr, answer_dr from assistant_faq",
            (rs, i) -> new Faq(rs.getString(1),
                Arrays.stream(rs.getString(2).split(",")).map(s -> norm(s).trim()).filter(s -> !s.isEmpty()).toList(),
                rs.getString(3), rs.getString(4), rs.getString(5)));
    }

    private void log(String q) {
        try {
            jdbc.update("insert into assistant_unanswered(question) values (?)", q.length() > 300 ? q.substring(0, 300) : q);
        } catch (Exception ignored) { }
    }

    // ---------- helpers ----------

    private static String lastUser(List<Msg> raw) {
        if (raw == null) return "";
        for (int i = raw.size() - 1; i >= 0; i--) {
            Msg m = raw.get(i);
            if (m != null && "user".equals(m.role()) && m.content() != null) return m.content().strip();
        }
        return "";
    }

    /** Lowercase, strip accents, keep letters and digits only, padded with spaces. */
    private static String norm(String s) {
        String d = Normalizer.normalize(s.toLowerCase(Locale.ROOT), Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return " " + d.replaceAll("[^a-z0-9]+", " ").trim() + " ";
    }

    /** Short keywords must match a whole word, longer ones match as a stem. */
    private static boolean has(String n, String k) {
        return k.length() <= 4 ? n.contains(" " + k + " ") : n.contains(k);
    }

    private static boolean anyHas(String n, String... keys) {
        for (String k : keys) if (has(n, norm(k).trim())) return true;
        return false;
    }

    private static String detect(String n) {
        int fr = 0, dr = 0;
        for (String w : n.trim().split(" ")) {
            if (FR.contains(w)) fr++;
            if (DR.contains(w)) dr++;
        }
        if (dr > fr) return "dr";
        if (fr > 0) return "fr";
        return "en";
    }

    private static String t(String lang, String en, String fr, String dr) {
        return "fr".equals(lang) ? fr : "dr".equals(lang) ? dr : en;
    }

    private void throttle(String email) {
        Deque<Long> q = hits.computeIfAbsent(email, k -> new ArrayDeque<>());
        long now = System.currentTimeMillis();
        synchronized (q) {
            while (!q.isEmpty() && now - q.peekFirst() > 60_000) q.pollFirst();
            if (q.size() >= MAX_PER_MINUTE) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many questions, wait a moment");
            }
            q.addLast(now);
        }
    }
}
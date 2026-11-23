-- Fermeture des failles RLS relevées par l'audit du 23/11/2026.
-- Le serveur utilise la clé service_role (non soumise aux RLS) : il continue de tout faire.
-- Ces règles laissaient les utilisateurs écrire directement des données sensibles depuis l'app.

-- Commandes : plus aucune modification directe (montant, statut, versement) par l'acheteur ou le vendeur.
drop policy if exists "Users update own orders" on public.orders;

-- Enchères : uniquement via le serveur (contrôle du montant, du lot, de l'enchère gagnante).
drop policy if exists "Users place bids" on public.bids;

-- Points de fidélité : plus d'auto-attribution.
drop policy if exists "Users can insert their own loyalty_points" on public.loyalty_points;
drop policy if exists "Users can update their own loyalty_points" on public.loyalty_points;

-- Offres : l'acheteur ne peut plus passer sa propre offre à « acceptée ».
drop policy if exists "Participants can update offers" on public.offers;

-- Équipe vendeur : un invité ne peut plus changer de boutique ni de rôle.
drop policy if exists "team_update_own" on public.seller_team_members;

-- Parrainage : plus de parrain choisi ni de récompense cochée par le filleul.
drop policy if exists "referrals_insert" on public.referrals;

-- Litiges : création uniquement via le serveur (vérifie que la commande est bien celle de l'acheteur).
drop policy if exists "Buyers create disputes" on public.disputes;

-- Codes promo : plus de lecture publique de tous les codes (le serveur les valide).
drop policy if exists "promo_codes_read" on public.promo_codes;

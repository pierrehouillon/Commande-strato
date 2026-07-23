# Commande Stratoconception — Groupe Livio

Formulaire de commande en ligne pour l'Atelier Stratoconception du Groupe Livio. Application web moderne permettant aux clients de commander des débits, réservations rondes/rectangulaires ou tran[...]

🌐 **Déploié en ligne :** https://commande-strato.vercel.app

---

## 📋 Vue d'ensemble

Ce projet propose une **interface web interactive** et **responsive** pour les bons de commande de l'Atelier Stratoconception. Le formulaire capture les informations de chantier et les détails te[...]

### ✨ Fonctionnalités principales

- ✅ **4 types de commande** : Débits, Réservations rondes, Réservations rectangulaires, Autres demandes
- ✅ **Thème clair/sombre** : Bascule automatique avec mémorisation
- ✅ **Interface réactive** : Tableaux répéteurs dynamiques (ajout/suppression de lignes)
- ✅ **Schémas interactifs** : Visualisation 3D du cylindre, croquis rectangulaires
- ✅ **Gestion des fichiers** : Upload de photos/croquis en base64, attachement automatique aux emails
- ✅ **Validation côté client** : Détection du type de commande, vérification des dates minimum
- ✅ **Design moderne** : Charte graphique Livio (rouge historique + gris béton)

---

## 🏗️ Architecture

```
├── index.html              # Application web unique (SPA)
│   ├── Thème clair/sombre
│   ├── 4 panneaux de commande
│   ├── Gestion des formulaires dynamiques
│   └── Intégration Vercel API
├── code.gs                 # Backend Google Apps Script (archivé)
├── logo_Peduzzi.png        # Logo du groupe
├── package.json            # Dépendances (Resend email service)
└── api/commande            # Fonction Vercel serverless (gérée en ligne)
```

### Flux de données

1. **Côté client** (index.html) :
   - Collecte des données du formulaire
   - Affichage conditionnel selon le type de commande
   - Envoi POST vers `/api/commande`

2. **Backend** (Vercel serverless) :
   - Réception des données (FormData)
   - Construction d'un email HTML formaté
   - Envoi via [Resend](https://resend.com) aux destinataires

3. **Destinataires** :
   - Type "Autres demandes" → `....`
   - Types techniques → `....`, `...`

---

## 🚀 Utilisation

### Pour les clients

1. Accédez à https://commande-strato.vercel.app
2. Remplissez les **Informations générales** (chantier, livraison, etc.)
3. Sélectionnez un **type de commande** et renseignez le détail
4. Cliquez sur **"Envoyer la commande"**
5. Confirmation par email à vos contacts internes

### Type de commande : Débits
- Sélection du matériau (CP 21 mm filmé, CP 18 mm, 3 plis épicéa, autre)
- Tableau dynamique : largeur × longueur × quantité
- Zone de remarques optionnelle

### Type de commande : Réservations rondes
- Tableau : diamètre × hauteur × dépouille × quantité
- Schéma 3D interactif pour sélectionner les faces coffrantes (a, b, c)
- Remarques optionnelles

### Type de commande : Réservations rectangulaires
- Tableau : hauteur h × largeur ℓ × longueur L × cotes × dépouille × quantité
- Schéma 2D pour comprendre les dimensions
- Sélection intérieur/extérieur pour les cotes

### Type de commande : Autres demandes
- Blocs répéteurs pour plusieurs demandes
- Upload de photos et/ou croquis (multiples fichiers)
- Description textuelle de chaque besoin
- Fichiers attachés automatiquement à l'email

---

## 🎨 Design & Accessibilité

### Charte graphique (CSS Tokens)
```css
--red: #C8102E                /* Rouge Livio historique */
--ink: #1E1F22                /* Texte principal */
--concrete: #6E7177           /* Texte secondaire (gris béton) */
--bg: #F2F2F3                 /* Fond clair */
--surface: #FFFFFF            /* Cartes et surfaces */
--radius: 12px                /* Coins arrondis */
--shadow: 0 1px 2px...        /* Ombre subtile */
```

### Thème sombre inclus
- Variables CSS réversibles avec `data-theme="dark"`
- Transitions fluides (0.2s)
- Adaptée aux préférences système (via toggle)

### Responsive
- Mobile first (2 colonnes → 1 colonne sous 640px)
- Tableaux scrollables horizontalement
- Bouton de soumission full-width sur mobile

---

## 🔧 Configuration & Déploiement

### Déploiement sur Vercel

1. **Cloner le repo**
   ```bash
   git clone https://github.com/pierrehouillon/Commande-strato.git
   cd Commande-strato
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Déployer sur Vercel**
   - Connectez votre GitHub à Vercel
   - Sélectionnez ce repo
   - Définis les variables d'environnement nécessaires si applicable
   - Vercel déploie automatiquement

4. **Mise à jour du formulaire**
   - Dans `index.html`, l'attribut `action="/api/commande"` pointe vers la fonction serverless
   - Cette fonction est gérée automatiquement par Vercel

### Variables d'environnement

#### Configuration obligatoire : clé Resend
```
RESEND_API_KEY=re_xxxxx
FROM_EMAIL=Atelier Livio <commandes@groupe-livio.com>
```

#### Configuration des destinataires
Pour ajouter des adresses mail de destination pour les commandes :

1. **Accédez au tableau de bord Vercel** : https://vercel.com
2. **Sélectionnez le projet** `Commande-strato`
3. **Allez dans les paramètres** : Settings → Environment Variables
4. **Cherchez ou créez la variable** `EMAIL_DESTINATAIRES`
5. **Entrez les adresses email** séparées par des virgules (sans espaces après les virgules) :
   ```
   commandes@groupe-livio.com,reception@groupe-livio.com,chef.chantier@groupe-livio.com
   ```
6. **Sauvegardez** et redéployez si nécessaire

**Exemple complet** :
```
EMAIL_DESTINATAIRES=commandes@groupe-livio.com,pierre.houillon@groupe-livio.com,atelier@groupe-livio.com
```

Tous les bons de commande envoyés seront maintenant reçus par ces adresses.

---

## 📧 Emails générés

Exemple d'email reçu :

```
Sujet : Nouvelle commande Stratoconception – Chantier PR2024 (Débits)

Corps HTML formaté avec :
- En-tête Livio (logo + branding)
- Section "Informations générales"
- Détail spécifique selon le type (tableau des dimensions)
- Remarques éventuelles
- Pièces jointes (photos, croquis)
```

---

## 🛠️ Développement local

### Prérequis
- Node.js 16+
- npm ou yarn

### Installation
```bash
git clone https://github.com/pierrehouillon/Commande-strato.git
cd Commande-strato
npm install
```

### Lancer un serveur local
```bash
npx http-server
# ou
python -m http.server 8000
# puis ouvrez http://localhost:8000
```

### Tester l'envoi
- Pour tester les emails en local, vous devrez configurer un backend local ou utiliser un service comme Ngrok
- Actuellement, la soumission pointe vers l'API Vercel en production

---

## 📝 Structure du formulaire HTML

```html
<form action="/api/commande" method="POST" id="livioForm">
  <!-- Section 1 : Informations générales -->
  <!-- Section 2 : Sélecteur de type + 4 panneaux -->
  <!-- Bouton "Envoyer la commande" -->
  <!-- Statut de réponse -->
</form>
```

### Champs principaux

**Informations générales** :
- `nom_chantier` (texte, obligatoire)
- `chef_chantier` (texte, obligatoire)
- `conducteur_travaux` (texte, obligatoire)
- `lieu_livraison` (select, obligatoire)
- `date_livraison` (date, min +24h, obligatoire)

**Débits** :
- `debit_materiau` (select)
- `debit_largeur[]`, `debit_longueur[]`, `debit_quantite[]` (tableaux)
- `debit_remarque` (textarea)

**Réservations rondes** :
- `ronde_diametre[]`, `ronde_hauteur[]`, `ronde_depouille[]`, `ronde_quantite[]`
- `ronde_faces[]` (checkboxes)
- `ronde_remarque`

**Réservations rectangulaires** :
- `rect_hauteur[]`, `rect_largeur[]`, `rect_longueur[]`, `rect_cotes[]`, `rect_depouille[]`, `rect_quantite[]`
- `rect_remarque`

**Autres demandes** :
- Blocs répéteurs avec `autre_description[]`, fichiers en base64

---

## 🐛 Limitations connues

- **Quota email Google** : La version Apps Script est limitée à ~100 emails/jour sur un compte Gmail standard
- **Taille des fichiers** : Les fichiers volumineux (>25 Mo) peuvent échouer en base64
- **Navigateurs anciens** : Nécessite ES6 (flexbox, FormData, fetch)

---

## 📄 Licences & Crédits

- **Groupe Livio** — Atelier Stratoconception®
- Adresse : 36 Rue des Ormes, 88160 Fresse-sur-Moselle
- Logo : `logo_Peduzzi.png`
- Design : Charte graphique Livio (rouge #C8102E + gris béton)

---

## 👥 Contacts

- **Questions sur les commandes** : phouillon@groupe-livio.com
- **Problèmes techniques** : Créez une [issue](https://github.com/pierrehouillon/Commande-strato/issues) ou contactez l'équipe de développement

---

## 📚 Ressources

- [Vercel Docs](https://vercel.com/docs)
- [Resend Email API](https://resend.com)
- [MDN Web Docs](https://developer.mozilla.org)

---

**Dernière mise à jour** : 2026-07-02  
**Auteur** : Pierre Houillon  et Nicolas JEDIDJA
**État** : Production ✅

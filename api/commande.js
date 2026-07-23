// =============================================================================
//  /api/commande.js  —  Fonction Serverless Vercel (runtime Node.js)
//  Atelier Stratoconception® — Bon de commande Livio
//
//  Reçoit le formulaire (multipart/form-data) envoyé par index.html,
//  reconstruit un récapitulatif HTML et l'envoie par e-mail via Resend,
//  en joignant les fichiers (transmis en Base64 par le front).
//
//  ⚠️ Le front convertit les fichiers en data-URL Base64 côté client et les
//     place dans des champs cachés (autre_fichier_base64[] / autre_fichier_nom[]).
//     Le corps multipart ne contient donc QUE du texte : l'API Web standard
//     request.formData() suffit, aucune lib de parsing binaire n'est nécessaire.
// =============================================================================

import { Resend } from 'resend';

// On force le runtime Node.js (Resend + payloads un peu volumineux y sont plus à l'aise).
export const config = { runtime: 'nodejs' };

const resend = new Resend(process.env.RESEND_API_KEY);

// -----------------------------------------------------------------------------
//  Tables de correspondance (valeurs techniques → libellés lisibles)
// -----------------------------------------------------------------------------
const LIEUX = {
    'fresse-sur-moselle': 'Fresse-sur-Moselle',
    'saint-etienne-les-remiremont': 'Saint-Étienne-lès-Remiremont',
    'transport': 'Via transport',
};

const TYPES = {
    debits: 'Débits',
    rondes: 'Réservations rondes',
    rectangulaires: 'Réservations rectangulaires',
    autres: 'Autres demandes',
};

const MATERIAUX = {
    cp21_filme: 'CP 21 mm filmé',
    cp18_bouleau_filme: 'CP 18 mm bouleau filmé',
    '3plis_epicea_27': '3 plis épicéa 27 mm',
    autre: 'Autre (précisé)',
};

const FACES = {
    A: 'Face a — dessus',
    B: 'Face b — latérale',
    C: 'Face c — dessous',
};

const COTES = { interieur: 'Intérieur', exterieur: 'Extérieur' };

// -----------------------------------------------------------------------------
//  Petits utilitaires
// -----------------------------------------------------------------------------

/** Échappe les caractères HTML pour éviter de casser le template / injection. */
function esc(value) {
    if (value === undefined || value === null) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** Remplace les valeurs vides par un tiret. */
function dash(value) {
    const s = (value ?? '').toString().trim();
    return s === '' ? '—' : esc(s);
}

/**
 * Construit un tableau HTML à partir de colonnes parallèles.
 * @param {string[]} headers  En-têtes de colonnes.
 * @param {Array<string[]>} columns  Tableau de colonnes (chaque colonne = un tableau de valeurs).
 * @param {Function[]} [formatters]  Formateurs optionnels par colonne (valeur → string).
 * @returns {string} HTML du tableau, ou message si aucune ligne.
 */
function buildTable(headers, columns, formatters = []) {
    const rowCount = columns.reduce((max, col) => Math.max(max, col.length), 0);
    if (rowCount === 0) return '<p style="color:#6E7177;margin:4px 0;">Aucune dimension renseignée.</p>';

    const th = headers
        .map((h) => `<th style="text-align:left;padding:8px 10px;border-bottom:2px solid #DCDDE0;font-size:12px;text-transform:uppercase;letter-spacing:.03em;color:#6E7177;">${esc(h)}</th>`)
        .join('');

    let body = '';
    for (let r = 0; r < rowCount; r++) {
        // On ignore les lignes entièrement vides (lignes ajoutées puis non remplies).
        const cells = columns.map((col) => (col[r] ?? '').toString().trim());
        if (cells.every((c) => c === '')) continue;

        const tds = columns
            .map((col, c) => {
                const raw = col[r] ?? '';
                const fmt = formatters[c];
                const display = fmt ? fmt(raw) : dash(raw);
                return `<td style="padding:8px 10px;border-bottom:1px solid #EEE;font-size:14px;color:#1E1F22;">${display}</td>`;
            })
            .join('');
        body += `<tr>${tds}</tr>`;
    }

    if (body === '') return '<p style="color:#6E7177;margin:4px 0;">Aucune dimension renseignée.</p>';

    return `
    <table style="width:100%;border-collapse:collapse;margin:6px 0 4px;">
      <thead><tr>${th}</tr></thead>
      <tbody>${body}</tbody>
    </table>`;
}

/** Bloc "section" du mail (titre + contenu). */
function section(title, contentHtml) {
    return `
    <div style="margin:0 0 22px;">
      <h2 style="font-size:16px;margin:0 0 10px;color:#C8102E;border-bottom:1px solid #DCDDE0;padding-bottom:6px;">${esc(title)}</h2>
      ${contentHtml}
    </div>`;
}

/** Ligne "label : valeur" pour les infos générales. */
function row(label, value) {
    return `
    <tr>
      <td style="padding:5px 12px 5px 0;color:#6E7177;font-size:13px;white-space:nowrap;vertical-align:top;">${esc(label)}</td>
      <td style="padding:5px 0;color:#1E1F22;font-size:14px;font-weight:600;">${dash(value)}</td>
    </tr>`;
}

// -----------------------------------------------------------------------------
//  Construction du corps de l'e-mail selon le type de commande
// -----------------------------------------------------------------------------
function buildDetailSection(type, get, getAll) {
    if (type === 'debits') {
        const matKey = get('debit_materiau');
        let materiau = MATERIAUX[matKey] || dash(matKey);
        if (matKey === 'autre') {
            const precision = get('debit_materiau_autre');
            materiau = precision ? `Autre : ${esc(precision)}` : 'Autre (non précisé)';
        }
        const table = buildTable(
            ['Largeur (mm)', 'Longueur (mm)', 'Quantité'],
            [getAll('debit_largeur[]'), getAll('debit_longueur[]'), getAll('debit_quantite[]')]
        );
        const remarque = get('debit_remarque');
        return section(
            'Détail — Débits',
            `<p style="margin:0 0 10px;font-size:14px;"><strong>Matériau :</strong> ${materiau}</p>${table}${
                remarque ? `<p style="margin:10px 0 0;font-size:14px;"><strong>Remarque :</strong> ${esc(remarque)}</p>` : ''
            }`
        );
    }

    if (type === 'rondes') {
        const table = buildTable(
            ['Diamètre (mm)', 'Hauteur (mm)', 'Dépouille (mm)', 'Quantité'],
            [getAll('ronde_diametre[]'), getAll('ronde_hauteur[]'), getAll('ronde_depouille[]'), getAll('ronde_quantite[]')]
        );
        const faces = getAll('ronde_faces[]').map((f) => FACES[f] || f);
        const remarque = get('ronde_remarque');
        return section(
            'Détail — Réservations rondes',
            `${table}
       <p style="margin:10px 0 0;font-size:14px;"><strong>Faces coffrantes :</strong> ${faces.length ? esc(faces.join(', ')) : '—'}</p>${
                remarque ? `<p style="margin:6px 0 0;font-size:14px;"><strong>Remarque :</strong> ${esc(remarque)}</p>` : ''
            }`
        );
    }

    if (type === 'rectangulaires') {
        const table = buildTable(
            ['Hauteur h (mm)', 'Largeur ℓ (mm)', 'Longueur L (mm)', 'Cotes', 'Dépouille (mm)', 'Quantité'],
            [
                getAll('rect_hauteur[]'),
                getAll('rect_largeur[]'),
                getAll('rect_longueur[]'),
                getAll('rect_cotes[]'),
                getAll('rect_depouille[]'),
                getAll('rect_quantite[]'),
            ],
            [undefined, undefined, undefined, (v) => (v ? esc(COTES[v] || v) : '—'), undefined, undefined]
        );
        const remarque = get('rect_remarque');
        return section(
            'Détail — Réservations rectangulaires',
            `${table}${
                remarque ? `<p style="margin:10px 0 0;font-size:14px;"><strong>Remarque :</strong> ${esc(remarque)}</p>` : ''
            }`
        );
    }

    if (type === 'autres') {
        const descriptions = getAll('autre_description[]').filter((d) => d.trim() !== '');
        const list = descriptions.length
            ? descriptions
                .map(
                    (d, i) =>
                        `<div style="margin:0 0 12px;padding:10px 12px;background:#F2F2F3;border-radius:8px;">
                 <div style="font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#6E7177;margin-bottom:4px;">Demande ${i + 1}</div>
                 <div style="font-size:14px;color:#1E1F22;white-space:pre-wrap;">${esc(d)}</div>
               </div>`
                )
                .join('')
            : '<p style="color:#6E7177;margin:4px 0;">Aucune description fournie.</p>';
        return section('Détail — Autres demandes', list);
    }

    return section('Détail', '<p style="color:#6E7177;">Type de commande inconnu.</p>');
}

// -----------------------------------------------------------------------------
//  Conversion des fichiers Base64 (data-URL) → pièces jointes Resend
// -----------------------------------------------------------------------------
function buildAttachments(getAll) {
    const datas = getAll('autre_fichier_base64[]');
    const noms = getAll('autre_fichier_nom[]');
    const attachments = [];

    for (let i = 0; i < datas.length; i++) {
        const dataUrl = (datas[i] || '').trim();
        if (!dataUrl) continue;

        // Format attendu : "data:<mime>;base64,<contenu>"
        const commaIndex = dataUrl.indexOf(',');
        const base64Content = commaIndex !== -1 ? dataUrl.slice(commaIndex + 1) : dataUrl;
        if (!base64Content) continue;

        const filename = (noms[i] || `piece-jointe-${i + 1}`).trim() || `piece-jointe-${i + 1}`;

        // Resend attend `content` = chaîne Base64 (sans le préfixe data:) et `filename`.
        attachments.push({ filename, content: base64Content });
    }

    return attachments;
}

// -----------------------------------------------------------------------------
//  Handler principal (signature Web standard : Request → Response)
// -----------------------------------------------------------------------------
export async function POST(request) {
    // -- Vérification de la configuration ---------------------------------------
    if (!process.env.RESEND_API_KEY) {
        console.error('RESEND_API_KEY manquante.');
        return Response.json({ error: 'Configuration serveur incomplète (clé e-mail manquante).' }, { status: 500 });
    }

    // -- Parsing du multipart/form-data (texte uniquement) ----------------------
    let formData;
    try {
        formData = await request.formData();
    } catch (err) {
        console.error('Échec du parsing du formulaire :', err);
        return Response.json({ error: 'Données du formulaire illisibles.' }, { status: 400 });
    }

    // Helpers d'accès aux champs
    const get = (name) => {
        const v = formData.get(name);
        return typeof v === 'string' ? v.trim() : '';
    };
    const getAll = (name) =>
        formData.getAll(name).filter((v) => typeof v === 'string').map((v) => v);

    // -- Données générales ------------------------------------------------------
    const type = get('type_commande');
    const nomChantier = get('nom_chantier');
    const chefChantier = get('chef_chantier');
    const conducteur = get('conducteur_travaux');
    const lieuKey = get('lieu_livraison');
    const dateLivraison = get('date_livraison');

    // -- Routage dynamique des destinataires ------------------------------------
    const destinatairesRaw = process.env.EMAIL_DESTINATAIRES || '';
    const destinataires = destinatairesRaw
        .split(',')
        .map((e) => e.trim())
        .filter((e) => e.length > 0);

    if (destinataires.length === 0) {
        return Response.json({ error: 'Aucun destinataire défini pour cette commande.' }, { status: 400 });
    }

    // -- Construction du corps HTML ---------------------------------------------
    const typeLabel = TYPES[type] || dash(type);
    const lieuLabel = LIEUX[lieuKey] || dash(lieuKey);

    const generalSection = section(
        'Informations générales',
        `<table style="border-collapse:collapse;">
       ${row('Type de commande', typeLabel)}
       ${row('Nom de chantier / PR', nomChantier)}
       ${row('Chef de chantier', chefChantier)}
       ${row('Conducteur de travaux', conducteur)}
       ${row('Lieu de livraison', lieuLabel)}
       ${row('Date de livraison souhaitée', dateLivraison)}
     </table>`
    );

    const detailSection = buildDetailSection(type, get, getAll);
    const attachments = buildAttachments(getAll);

    const attachmentsNote = attachments.length
        ? `<p style="font-size:13px;color:#6E7177;margin:0;">${attachments.length} pièce(s) jointe(s) à cet e-mail.</p>`
        : '';

    const html = `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:680px;margin:0 auto;color:#1E1F22;">
    <div style="background:#1E1F22;color:#fff;padding:18px 22px;border-radius:12px 12px 0 0;">
      <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#C8102E;font-weight:700;">Bon de commande</div>
      <div style="font-size:20px;font-weight:800;margin-top:2px;">Atelier Stratoconception®</div>
    </div>
    <div style="border:1px solid #DCDDE0;border-top:none;border-radius:0 0 12px 12px;padding:22px;background:#fff;">
      ${generalSection}
      ${detailSection}
      ${attachmentsNote}
    </div>
    <p style="text-align:center;color:#6E7177;font-size:12px;margin:16px 0 0;">
      Groupe Livio — Atelier Stratoconception® · 36 Rue des Ormes, 88160 Fresse-sur-Moselle
    </p>
  </div>`;

    // Version texte minimale (fallback clients sans HTML)
    const text =
        `Nouvelle commande — ${typeLabel}\n` +
        `Chantier/PR : ${nomChantier || '—'}\n` +
        `Chef de chantier : ${chefChantier || '—'}\n` +
        `Conducteur : ${conducteur || '—'}\n` +
        `Lieu : ${lieuLabel}\n` +
        `Date souhaitée : ${dateLivraison || '—'}\n` +
        (attachments.length ? `Pièces jointes : ${attachments.length}\n` : '');

    // -- Objet de l'e-mail ------------------------------------------------------
    const subjectChantier = nomChantier || 'sans nom de chantier';
    const subject = `${typeLabel} — ${subjectChantier} —  Commande Stratoconception  `;

    // -- Envoi via Resend -------------------------------------------------------
    try {
        const { data, error } = await resend.emails.send({
            from: process.env.FROM_EMAIL, // ex: "Atelier Livio <commandes@groupe-livio.com>"
            to: destinataires,
            subject,
            html,
            text,
            ...(attachments.length ? { attachments } : {}),
        });

        if (error) {
            console.error('Erreur Resend :', error);
            return Response.json({ error: "L'envoi de l'e-mail a échoué." }, { status: 502 });
        }

        return Response.json({ ok: true, id: data?.id ?? null });
    } catch (err) {
        console.error('Exception lors de l’envoi :', err);
        return Response.json({ error: "Une erreur interne est survenue lors de l'envoi." }, { status: 500 });
    }
}

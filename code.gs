/**
 * Atelier Stratoconception® — Groupe Livio
 * Réception du formulaire de commande (POST) et envoi d'un email récapitulatif
 * en HTML aux 3 destinataires, avec les photos/croquis en pièce jointe.
 *
 * DÉPLOIEMENT :
 * 1. Coller ce code dans l'éditeur Apps Script (script.google.com → Nouveau projet).
 * 2. Déployer > Nouveau déploiement > Type : Application Web.
 *      - Exécuter en tant que : Moi
 *      - Qui a accès : Tout le monde
 * 3. Copier l'URL du déploiement dans l'attribut action du formulaire HTML
 *    (à la place de TON_URL_GOOGLE_APPS_SCRIPT_ICI).
 * 4. À chaque modification du code, redéployer (Gérer les déploiements > Modifier)
 *    pour que l'URL reste valide avec la dernière version.
 *
 * Limite à connaître : MailApp.sendEmail est soumis au quota d'envoi quotidien
 * du compte Google utilisé (env. 100 emails/jour sur un compte Gmail standard,
 * davantage sur un compte Google Workspace).

 */

var DESTINATAIRES_PAR_DEFAUT = [
  'njedidja@groupe-livio.com',
  'surabondancenicolas@gmail.com'
];

var LABELS_TYPE = {
  debits: 'Débits',
  rondes: 'Réservations rondes',
  rectangulaires: 'Réservations rectangulaires',
  autres: 'Autres demandes'
};

/* ===================== Point d'entrée ===================== */

function doPost(e) {
  try {
    var data = e.parameter; // valeurs simples (un seul champ par nom)
    var arrays = e.parameters || {}; // valeurs multiples (champs "nom[]")

    var destinataires = (data.destinataires || DESTINATAIRES_PAR_DEFAUT.join(','))
      .split(',')
      .map(function (s) { return s.trim(); })
      .filter(Boolean);

    var type = data.type_commande || '';
    var detailHtml = buildDetailSection(type, arrays, data);
    var attachments = buildAttachments(arrays);

    var subject = 'Nouvelle commande Stratoconception – ' +
      (data.nom_chantier || 'Chantier non renseigné') +
      ' (' + (LABELS_TYPE[type] || type || 'Type non précisé') + ')';

    MailApp.sendEmail({
      to: destinataires.join(','),
      subject: subject,
      htmlBody: buildEmailHtml(data, type, detailHtml),
      attachments: attachments,
      name: " Commande StratoConception" // <--- C'est ici !
    });

    return ContentService.createTextOutput('OK');
  } catch (err) {
    // En cas d'erreur, on s'auto-alerte pour ne pas perdre la commande silencieusement.
    try {
      MailApp.sendEmail({
        to: Session.getActiveUser().getEmail(),
        subject: 'Erreur formulaire Stratoconception',
        body: 'Erreur : ' + err.message + '\n\nDonnées reçues :\n' + JSON.stringify(e.parameter)
      });
    } catch (e2) { /* ignore */ }
    return ContentService.createTextOutput('ERROR: ' + err.message);
  }
}

function doGet(e) {
  return ContentService.createTextOutput('Le script du formulaire Stratoconception est actif.');
}

/* ===================== Helpers génériques ===================== */

function arr(arrays, key) {
  return arrays[key] || [];
}

function esc(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function row(label, value) {
  if (!value) return '';
  return '<tr>' +
    '<td style="padding:6px 10px;border:1px solid #DCDDE0;background:#F2F2F3;font-weight:600;white-space:nowrap;">' + esc(label) + '</td>' +
    '<td style="padding:6px 10px;border:1px solid #DCDDE0;">' + esc(value) + '</td>' +
    '</tr>';
}

function infoTable(rowsHtml) {
  return '<table style="border-collapse:collapse;width:100%;margin:0 0 18px;font-size:13.5px;">' + rowsHtml + '</table>';
}

function tableHeader(cols) {
  return '<tr>' + cols.map(function (c) {
    return '<th style="padding:7px 9px;border:1px solid #DCDDE0;background:#1E1F22;color:#fff;font-size:12px;text-transform:uppercase;letter-spacing:.03em;text-align:left;">' + esc(c) + '</th>';
  }).join('') + '</tr>';
}

function tableCell(value) {
  return '<td style="padding:7px 9px;border:1px solid #DCDDE0;font-size:13.5px;">' + esc(value) + '</td>';
}

function remarqueBlock(remarque) {
  if (!remarque) return '';
  return '<div style="margin-top:6px;padding:10px 12px;background:#FBE9EB;border:1px solid #DCDDE0;border-radius:6px;">' +
    '<div style="font-weight:600;font-size:12.5px;color:#9E0C24;margin-bottom:4px;">Remarque</div>' +
    '<div style="font-size:13.5px;">' + esc(remarque).replace(/\n/g, '<br>') + '</div>' +
    '</div>';
}

function lieuLabel(value) {
  var labels = {
    'fresse-sur-moselle': 'Fresse-sur-Moselle',
    'saint-etienne-les-remiremont': 'Saint-Étienne-lès-Remiremont',
    'transport': 'Via transport'
  };
  return labels[value] || value;
}

/* ===================== Sections par type de commande ===================== */

function buildDetailSection(type, arrays, data) {
  if (type === 'debits') return buildDebits(arrays, data);
  if (type === 'rondes') return buildRondes(arrays, data);
  if (type === 'rectangulaires') return buildRect(arrays, data);
  if (type === 'autres') return buildAutres(arrays, data);
  return '<p style="color:#6E7177;">Aucun détail de commande transmis.</p>';
}

function buildDebits(arrays, data) {
  var materiauLabels = {
    cp21_filme: 'CP 21 mm filmé',
    cp18_bouleau_filme: 'CP 18 mm bouleau filmé',
    '3plis_epicea_27': '3 plis épicéa 27 mm',
    autre: data.debit_materiau_autre ? ('Autre : ' + data.debit_materiau_autre) : 'Autre'
  };
  var materiau = materiauLabels[data.debit_materiau] || data.debit_materiau || '—';

  var largeurs = arr(arrays, 'debit_largeur[]');
  var longueurs = arr(arrays, 'debit_longueur[]');
  var quantites = arr(arrays, 'debit_quantite[]');

  var rowsHtml = '';
  for (var i = 0; i < largeurs.length; i++) {
    if (!largeurs[i] && !longueurs[i] && !quantites[i]) continue;
    rowsHtml += '<tr>' +
      tableCell(largeurs[i] + ' mm') +
      tableCell(longueurs[i] + ' mm') +
      tableCell(quantites[i]) +
      '</tr>';
  }

  var html = infoTable(row('Matériau', materiau));
  html += '<table style="border-collapse:collapse;width:100%;margin-bottom:14px;">' +
    tableHeader(['Largeur', 'Longueur', 'Quantité']) + rowsHtml + '</table>';
  html += remarqueBlock(data.debit_remarque);
  return html;
}

function buildRondes(arrays, data) {
  var diametres = arr(arrays, 'ronde_diametre[]');
  var hauteurs = arr(arrays, 'ronde_hauteur[]');
  var depouilles = arr(arrays, 'ronde_depouille[]');
  var quantites = arr(arrays, 'ronde_quantite[]');
  var faces = arr(arrays, 'ronde_faces[]');

  var rowsHtml = '';
  for (var i = 0; i < diametres.length; i++) {
    if (!diametres[i] && !hauteurs[i] && !quantites[i]) continue;
    rowsHtml += '<tr>' +
      tableCell(diametres[i] + ' mm') +
      tableCell(hauteurs[i] + ' mm') +
      tableCell(depouilles[i] ? depouilles[i] + ' mm' : '—') +
      tableCell(quantites[i]) +
      '</tr>';
  }

  var html = '<table style="border-collapse:collapse;width:100%;margin-bottom:14px;">' +
    tableHeader(['Diamètre', 'Hauteur', 'Dépouille', 'Quantité']) + rowsHtml + '</table>';
  html += infoTable(row('Faces coffrantes', faces.length ? faces.join(', ') : '—'));
  html += remarqueBlock(data.ronde_remarque);
  return html;
}

function buildRect(arrays, data) {
  var hauteurs = arr(arrays, 'rect_hauteur[]');
  var largeurs = arr(arrays, 'rect_largeur[]');
  var longueurs = arr(arrays, 'rect_longueur[]');
  var cotes = arr(arrays, 'rect_cotes[]');
  var depouilles = arr(arrays, 'rect_depouille[]');
  var quantites = arr(arrays, 'rect_quantite[]');

  var cotesLabels = { interieur: 'Intérieur', exterieur: 'Extérieur' };

  var rowsHtml = '';
  for (var i = 0; i < hauteurs.length; i++) {
    if (!hauteurs[i] && !largeurs[i] && !longueurs[i] && !quantites[i]) continue;
    rowsHtml += '<tr>' +
      tableCell(hauteurs[i] + ' mm') +
      tableCell(largeurs[i] + ' mm') +
      tableCell(longueurs[i] + ' mm') +
      tableCell(cotesLabels[cotes[i]] || cotes[i] || '—') +
      tableCell(depouilles[i] ? depouilles[i] + ' mm' : '—') +
      tableCell(quantites[i]) +
      '</tr>';
  }

  var html = '<table style="border-collapse:collapse;width:100%;margin-bottom:14px;">' +
    tableHeader(['Hauteur (h)', 'Largeur (l)', 'Longueur (L)', 'Cotes', 'Dépouille', 'Quantité']) + rowsHtml + '</table>';
  html += remarqueBlock(data.rect_remarque);
  return html;
}

function buildAutres(arrays, data) {
  var descriptions = arr(arrays, 'autre_description[]');
  var noms = arr(arrays, 'autre_fichier_nom[]');

  var html = '';
  descriptions.forEach(function (desc, i) {
    if (!desc) return;
    html += '<div style="margin-bottom:10px;padding:10px 12px;background:#F2F2F3;border:1px solid #DCDDE0;border-radius:6px;">' +
      '<div style="font-weight:600;font-size:12.5px;color:#6E7177;margin-bottom:4px;">Demande ' + (i + 1) + '</div>' +
      '<div style="font-size:13.5px;">' + esc(desc).replace(/\n/g, '<br>') + '</div>' +
      '</div>';
  });

  if (noms.length) {
    html += '<p style="font-size:12.5px;color:#6E7177;">Fichier(s) joint(s) en pièce jointe de cet email : ' + esc(noms.join(', ')) + '</p>';
  }

  return html || '<p style="color:#6E7177;">Aucune demande détaillée transmise.</p>';
}

/* ===================== Pièces jointes (base64 → Blob) ===================== */

function buildAttachments(arrays) {
  var base64s = arr(arrays, 'autre_fichier_base64[]');
  var noms = arr(arrays, 'autre_fichier_nom[]');
  var attachments = [];

  base64s.forEach(function (dataUrl, i) {
    if (!dataUrl) return;
    var match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
    if (!match) return;
    var mimeType = match[1];
    var base64Data = match[2];
    var filename = noms[i] || ('fichier-' + (i + 1));
    try {
      attachments.push(Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, filename));
    } catch (err) {
      // Fichier corrompu ou trop volumineux : on l'ignore plutôt que de bloquer l'envoi.
    }
  });

  return attachments;
}

/* ===================== Assemblage final de l'email ===================== */

function buildEmailHtml(data, type, detailHtml) {
  var generalRows =
    row('Nom de chantier / PR', data.nom_chantier) +
    row('Chef de chantier', data.chef_chantier) +
    row('Conducteur de travaux', data.conducteur_travaux) +
    row('Lieu de livraison', lieuLabel(data.lieu_livraison)) +
    row('Date de livraison souhaitée', data.date_livraison);

  return '' +
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:620px;margin:0 auto;">' +
      '<div style="background:#1E1F22;padding:16px 20px;border-radius:8px 8px 0 0;">' +
        '<span style="display:inline-block;background:#C8102E;color:#fff;font-weight:800;border-radius:5px;padding:3px 9px;margin-right:8px;">L</span>' +
        '<span style="color:#fff;font-weight:700;letter-spacing:.05em;">LIVIO — ATELIER STRATOCONCEPTION®</span>' +
      '</div>' +
      '<div style="border:1px solid #DCDDE0;border-top:none;padding:20px;border-radius:0 0 8px 8px;">' +
        '<h2 style="margin:0 0 14px;font-size:17px;color:#1E1F22;">Nouvelle commande reçue</h2>' +
        infoTable(generalRows) +
        '<div style="margin:18px 0 10px;">' +
          '<span style="display:inline-block;background:#FBE9EB;color:#C8102E;font-weight:700;font-size:12px;letter-spacing:.04em;text-transform:uppercase;padding:3px 9px;border-radius:5px;">' +
            esc(LABELS_TYPE[type] || type || 'Type non précisé') +
          '</span>' +
        '</div>' +
        detailHtml +
      '</div>' +
      '<p style="color:#6E7177;font-size:11.5px;text-align:center;margin-top:14px;">Email généré automatiquement par le formulaire de commande en ligne.</p>' +
    '</div>';
}

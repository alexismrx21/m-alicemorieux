/* Endpoint du formulaire de contact — envoi via Resend.
   Fonction serverless Vercel, sans dépendance : l'API Resend est appelée
   directement en HTTP. La clé n'existe que côté serveur (variable
   d'environnement), jamais dans le JavaScript envoyé au navigateur. */

"use strict";

var DESTINATAIRE = process.env.CONTACT_TO || "alice.morieux.psy@gmail.com";
var EXPEDITEUR = process.env.CONTACT_FROM || "onboarding@resend.dev";

var LIMITES = { nom: 120, email: 180, objet: 200, message: 5000 };

/* Anti-abus minimal : mémoire de l'instance serverless. Une instance froide
   repart à zéro, ce n'est donc qu'un garde-fou contre les envois en rafale. */
var FENETRE_MS = 10 * 60 * 1000;
var MAX_PAR_FENETRE = 5;
var envois = new Map();

function tropDeRequetes(ip) {
  var maintenant = Date.now();
  var recents = (envois.get(ip) || []).filter(function (t) {
    return maintenant - t < FENETRE_MS;
  });

  if (recents.length >= MAX_PAR_FENETRE) return true;

  recents.push(maintenant);
  envois.set(ip, recents);

  // on empêche la Map de grossir indéfiniment
  if (envois.size > 500) {
    envois.forEach(function (dates, cle) {
      if (!dates.some(function (t) { return maintenant - t < FENETRE_MS; })) {
        envois.delete(cle);
      }
    });
  }

  return false;
}

function texte(valeur, max) {
  return typeof valeur === "string" ? valeur.trim().slice(0, max) : "";
}

function emailValide(valeur) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valeur);
}

function echapper(valeur) {
  return String(valeur)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function corpsHtml(donnees) {
  return (
    '<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1f2d2b">' +
    "<h2 style=\"font-size:17px;margin:0 0 16px\">Nouveau message depuis le site</h2>" +
    "<p><strong>Nom :</strong> " + echapper(donnees.nom) + "</p>" +
    '<p><strong>E-mail :</strong> <a href="mailto:' + echapper(donnees.email) + '">' + echapper(donnees.email) + "</a></p>" +
    "<p><strong>Objet :</strong> " + echapper(donnees.objet) + "</p>" +
    '<hr style="border:0;border-top:1px solid #dcdcdc;margin:20px 0">' +
    '<p style="white-space:pre-wrap;margin:0">' + echapper(donnees.message) + "</p>" +
    '<p style="margin-top:24px;font-size:13px;color:#6b7c79">' +
    "Répondre à ce message écrit directement à l'expéditeur." +
    "</p></div>"
  );
}

function corpsTexte(donnees) {
  return (
    "Nouveau message depuis le site\n\n" +
    "Nom : " + donnees.nom + "\n" +
    "E-mail : " + donnees.email + "\n" +
    "Objet : " + donnees.objet + "\n\n" +
    donnees.message + "\n"
  );
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ erreur: "Méthode non autorisée." });
  }

  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY absente des variables d'environnement.");
    return res.status(500).json({ erreur: "Le service d'envoi n'est pas configuré." });
  }

  var brut = req.body;
  if (typeof brut === "string") {
    try {
      brut = JSON.parse(brut);
    } catch (e) {
      return res.status(400).json({ erreur: "Requête illisible." });
    }
  }
  if (!brut || typeof brut !== "object") {
    return res.status(400).json({ erreur: "Requête illisible." });
  }

  // Champ leurre : invisible pour un visiteur, souvent rempli par les robots.
  if (texte(brut.site, 200)) {
    return res.status(200).json({ ok: true });
  }

  var donnees = {
    nom: texte(brut.nom, LIMITES.nom),
    email: texte(brut.email, LIMITES.email),
    objet: texte(brut.objet, LIMITES.objet) || "Demande de contact",
    message: texte(brut.message, LIMITES.message) || "(aucun message)"
  };

  if (!donnees.nom) {
    return res.status(400).json({ erreur: "Le nom est obligatoire.", champ: "nom" });
  }
  if (!emailValide(donnees.email)) {
    return res.status(400).json({ erreur: "Saisissez une adresse e-mail valide.", champ: "email" });
  }

  var ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "inconnu";

  if (tropDeRequetes(ip)) {
    return res.status(429).json({
      erreur: "Trop de messages envoyés. Réessayez dans quelques minutes."
    });
  }

  try {
    var reponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + process.env.RESEND_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: EXPEDITEUR,
        to: [DESTINATAIRE],
        reply_to: donnees.email,
        subject: "[Site] " + donnees.objet + " — " + donnees.nom,
        html: corpsHtml(donnees),
        text: corpsTexte(donnees)
      })
    });

    if (!reponse.ok) {
      var detail = await reponse.text();
      console.error("Erreur Resend", reponse.status, detail);
      return res.status(502).json({
        erreur: "L'envoi a échoué. Écrivez-moi directement à " + DESTINATAIRE + "."
      });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Appel Resend impossible", e);
    return res.status(502).json({
      erreur: "L'envoi a échoué. Écrivez-moi directement à " + DESTINATAIRE + "."
    });
  }
};

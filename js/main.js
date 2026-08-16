/* Alice Morieux — interactions du site (aucune dépendance) */

(function () {
  "use strict";

  /* ----- Menu mobile ----- */
  var burger = document.querySelector(".burger");
  var nav = document.querySelector(".nav");

  if (burger && nav) {
    var fermerMenu = function () {
      nav.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
    };

    burger.addEventListener("click", function () {
      var ouvert = nav.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", ouvert ? "true" : "false");
    });

    // Fermeture au clic sur un lien
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) fermerMenu();
    });

    // Fermeture avec Échap
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        fermerMenu();
        burger.focus();
      }
    });

    // Réinitialisation au passage en desktop
    window.addEventListener("resize", function () {
      if (window.innerWidth > 900) fermerMenu();
    });
  }

  /* ----- Apparition au scroll ----- */
  var cibles = document.querySelectorAll(".reveal");

  if (cibles.length) {
    var reduitMouvement = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reduitMouvement || !("IntersectionObserver" in window)) {
      cibles.forEach(function (el) {
        el.classList.add("is-visible");
      });
    } else {
      var observateur = new IntersectionObserver(
        function (entrees) {
          entrees.forEach(function (entree) {
            if (entree.isIntersecting) {
              entree.target.classList.add("is-visible");
              observateur.unobserve(entree.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
      );

      cibles.forEach(function (el) {
        observateur.observe(el);
      });
    }
  }

  /* ----- Formulaire de contact -----
     Site statique, sans serveur : le message est remis au logiciel de
     messagerie du visiteur via un lien mailto. Aucune donnée ne transite
     par un service tiers. */
  var form = document.getElementById("form-contact");

  if (form) {
    var DESTINATAIRE = "alice.morieux.psy@gmail.com";
    var note = document.getElementById("form-note");
    var noteTexte = note ? note.textContent : "";

    var messageErreur = function (champ) {
      if (champ.validity.valueMissing) return "Ce champ est obligatoire.";
      if (champ.validity.typeMismatch) return "Saisissez une adresse e-mail valide.";
      return "";
    };

    var afficherErreur = function (champ, texte) {
      var bloc = champ.parentNode;
      var existant = bloc.querySelector(".champ__erreur");

      if (!texte) {
        champ.removeAttribute("aria-invalid");
        if (existant) existant.remove();
        return;
      }

      champ.setAttribute("aria-invalid", "true");
      if (!existant) {
        existant = document.createElement("p");
        existant.className = "champ__erreur";
        bloc.appendChild(existant);
      }
      existant.textContent = texte;
    };

    // On efface l'erreur dès que le visiteur corrige sa saisie
    form.addEventListener("input", function (e) {
      if (e.target.matches(".champ__saisie") && e.target.checkValidity()) {
        afficherErreur(e.target, "");
      }
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var champs = form.querySelectorAll(".champ__saisie");
      var premierInvalide = null;

      champs.forEach(function (champ) {
        var texte = champ.checkValidity() ? "" : messageErreur(champ);
        afficherErreur(champ, texte);
        if (texte && !premierInvalide) premierInvalide = champ;
      });

      if (premierInvalide) {
        premierInvalide.focus();
        return;
      }

      var nom = form.nom.value.trim();
      var email = form.email.value.trim();
      var objet = form.objet.value.trim() || "Demande de contact";
      var message = form.message.value.trim();

      var corps =
        "Nom : " + nom + "\n" +
        "E-mail : " + email + "\n\n" +
        (message || "(aucun message)");

      // un lien cliqué passe mieux que window.location selon les navigateurs
      var lien = document.createElement("a");
      lien.href =
        "mailto:" + DESTINATAIRE +
        "?subject=" + encodeURIComponent(objet) +
        "&body=" + encodeURIComponent(corps);
      lien.style.display = "none";
      document.body.appendChild(lien);
      lien.click();
      document.body.removeChild(lien);

      if (note) {
        note.textContent =
          "Votre logiciel de messagerie vient de s'ouvrir avec votre message. " +
          "S'il ne s'ouvre pas, écrivez directement à " + DESTINATAIRE + ".";
        note.classList.add("formulaire__note--succes");

        window.setTimeout(function () {
          note.textContent = noteTexte;
          note.classList.remove("formulaire__note--succes");
        }, 12000);
      }
    });
  }

  /* ----- Année courante dans le pied de page ----- */
  var annee = document.querySelector("[data-annee]");
  if (annee) annee.textContent = new Date().getFullYear();
})();

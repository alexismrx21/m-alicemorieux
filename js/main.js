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

  /* ----- Carrousel (approches) -----
     Une carte à la fois, flèches, points de position et bouton lecture/pause.
     Toute l'interface de pilotage est créée ici : sans JavaScript, les cartes
     restent simplement empilées et entièrement lisibles. */
  var FLECHE_G =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5 8 12l7 7"/></svg>';
  var FLECHE_D =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>';
  var ICONE_PAUSE =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>';
  var ICONE_LECTURE =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>';

  document.querySelectorAll("[data-carrousel]").forEach(function (carrousel) {
    var cadre = carrousel.querySelector(".carrousel__cadre");
    var piste = carrousel.querySelector(".carrousel__piste");
    var slides = Array.prototype.slice.call(
      carrousel.querySelectorAll(".carrousel__slide")
    );

    if (!cadre || !piste || slides.length < 2) return;

    var intervalle = parseInt(carrousel.dataset.carrouselIntervalle, 10) || 8000;
    var mouvementReduit = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    var index = 0;
    var minuteur = null;
    var pauseDemandee = mouvementReduit; // on ne lance rien si l'animation est réduite
    var suspendu = false; // survol, focus ou onglet en arrière-plan

    /* --- Construction des commandes --- */
    var faireBouton = function (classe, libelle, contenu) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = classe;
      b.setAttribute("aria-label", libelle);
      b.innerHTML = contenu;
      return b;
    };

    var barre = document.createElement("div");
    barre.className = "carrousel__barre";

    var prec = faireBouton(
      "carrousel__fleche carrousel__fleche--prec",
      "Approche précédente",
      FLECHE_G
    );
    var suiv = faireBouton(
      "carrousel__fleche carrousel__fleche--suiv",
      "Approche suivante",
      FLECHE_D
    );

    var points = document.createElement("div");
    points.className = "carrousel__points";

    var pastilles = slides.map(function (slide, i) {
      var titre = slide.querySelector("h2, h3");
      var nom = titre ? titre.textContent.trim() : "Approche " + (i + 1);
      var p = faireBouton("carrousel__point", "Afficher : " + nom, "");
      p.addEventListener("click", function () {
        aller(i);
        relancer();
      });
      points.appendChild(p);
      return p;
    });

    var lecture = faireBouton(
      "carrousel__lecture",
      "Mettre le défilement en pause",
      ICONE_PAUSE
    );

    barre.appendChild(prec);
    barre.appendChild(points);
    barre.appendChild(lecture);
    barre.appendChild(suiv);
    carrousel.appendChild(barre);

    /* --- Rôles d'accessibilité --- */
    carrousel.setAttribute("role", "region");
    carrousel.setAttribute("aria-roledescription", "carrousel");
    carrousel.setAttribute(
      "aria-label",
      carrousel.dataset.carrouselTitre || "Carrousel"
    );

    slides.forEach(function (slide, i) {
      slide.setAttribute("role", "group");
      slide.setAttribute("aria-roledescription", "diapositive");
      slide.setAttribute("aria-label", i + 1 + " sur " + slides.length);
    });

    carrousel.classList.add("is-actif");

    /* --- Affichage ---
       Chaque carte reçoit sa position par rapport à celle du centre
       (0, -1, 1…) ; le placement lui-même est décrit en CSS. */
    var aller = function (n) {
      var total = slides.length;
      index = (n + total) % total;

      slides.forEach(function (slide, i) {
        var ecart = i - index;
        // on prend toujours le chemin le plus court, gauche ou droite
        if (ecart > total / 2) ecart -= total;
        if (ecart < -total / 2) ecart += total;

        slide.dataset.position = ecart;
        slide.classList.toggle("is-visible-slide", ecart === 0);
        slide.setAttribute("aria-hidden", ecart === 0 ? "false" : "true");
      });

      pastilles.forEach(function (p, i) {
        p.setAttribute("aria-current", i === index ? "true" : "false");
      });
    };

    /* un clic sur une carte entrevue la ramène au centre */
    slides.forEach(function (slide, i) {
      slide.addEventListener("click", function () {
        if (i === index) return;
        aller(i);
        relancer();
      });
    });

    /* --- Défilement automatique --- */
    var arreter = function () {
      if (minuteur) {
        window.clearInterval(minuteur);
        minuteur = null;
      }
    };

    var relancer = function () {
      arreter();
      if (pauseDemandee || suspendu) return;
      minuteur = window.setInterval(function () {
        aller(index + 1);
      }, intervalle);
    };

    var majBoutonLecture = function () {
      lecture.innerHTML = pauseDemandee ? ICONE_LECTURE : ICONE_PAUSE;
      lecture.setAttribute(
        "aria-label",
        pauseDemandee
          ? "Reprendre le défilement automatique"
          : "Mettre le défilement en pause"
      );
      // lecture en cours : l'annonce du changement de carte serait une gêne
      piste.setAttribute("aria-live", pauseDemandee ? "polite" : "off");
    };

    lecture.addEventListener("click", function () {
      pauseDemandee = !pauseDemandee;
      majBoutonLecture();
      relancer();
    });

    prec.addEventListener("click", function () {
      aller(index - 1);
      relancer();
    });

    suiv.addEventListener("click", function () {
      aller(index + 1);
      relancer();
    });

    /* on suspend pendant que le visiteur lit ou navigue au clavier */
    var suspendre = function (etat) {
      suspendu = etat;
      relancer();
    };

    carrousel.addEventListener("mouseenter", function () {
      suspendre(true);
    });
    carrousel.addEventListener("mouseleave", function () {
      suspendre(false);
    });
    carrousel.addEventListener("focusin", function () {
      suspendre(true);
    });
    carrousel.addEventListener("focusout", function () {
      if (!carrousel.contains(document.activeElement)) suspendre(false);
    });

    document.addEventListener("visibilitychange", function () {
      suspendre(document.hidden);
    });

    carrousel.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        aller(index - 1);
        relancer();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        aller(index + 1);
        relancer();
      }
    });

    /* --- Balayage tactile --- */
    var departX = null;
    var departY = null;

    cadre.addEventListener(
      "touchstart",
      function (e) {
        departX = e.touches[0].clientX;
        departY = e.touches[0].clientY;
      },
      { passive: true }
    );

    cadre.addEventListener(
      "touchend",
      function (e) {
        if (departX === null) return;
        var dx = e.changedTouches[0].clientX - departX;
        var dy = e.changedTouches[0].clientY - departY;
        departX = null;
        // geste franchement horizontal seulement, pour ne pas gêner le scroll
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
          aller(dx < 0 ? index + 1 : index - 1);
          relancer();
        }
      },
      { passive: true }
    );

    majBoutonLecture();
    aller(0);
    relancer();
  });

  /* ----- Année courante dans le pied de page ----- */
  var annee = document.querySelector("[data-annee]");
  if (annee) annee.textContent = new Date().getFullYear();
})();

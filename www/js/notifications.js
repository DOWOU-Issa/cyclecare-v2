/* =============================================
   js/notifications.js — Rappels locaux
   =============================================
   Stratégie "le bon outil pour chaque plateforme" :
     - Android (app empaquetée via Capacitor) : @capacitor/local-notifications.
       C'est le SEUL moyen d'obtenir de VRAIES notifications planifiées qui se
       déclenchent même quand l'application est fermée — l'API web ne le permet
       pas. Le plugin natif est exposé automatiquement sur
       window.Capacitor.Plugins.LocalNotifications après `npm install
       @capacitor/local-notifications && npx cap sync`, sans bundler requis.
     - Web (GitHub Pages) / Windows (Electron) : Web Notification API standard.
       Electron l'implémente nativement dans le renderer. Sur le web, sans
       service worker + push, on ne peut pas notifier hors session active :
       on vérifie donc à chaque ouverture de l'app si un rappel est dû
       ("best effort"), ce qui est honnête et transparent pour l'utilisatrice.
   ============================================= */

var Notif = {
  _startupAsked: false,

  isCapacitor: function() {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  },
  nativePlugin: function() {
    return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
  },
  hasWebApi: function() {
    return typeof Notification !== 'undefined';
  },
  isSupported: function() {
    return (this.isCapacitor() && !!this.nativePlugin()) || this.hasWebApi();
  },
  isEnabled: function() {
    var u = getUser();
    return !!(u && u.notifPrefs && u.notifPrefs.enabled);
  },
  permissionState: function() {
    if (this.isCapacitor()) return 'native';
    if (this.hasWebApi()) return Notification.permission; /* 'granted' | 'denied' | 'default' */
    return 'unsupported';
  },

  /* ---- Demande de permission ---- */
  requestPermission: async function() {
    if (this.isCapacitor()) {
      try {
        var LN = this.nativePlugin();
        if (!LN) return false;
        if (LN.checkPermissions) {
          var current = await LN.checkPermissions();
          if (current && current.display === 'granted') return true;
        }
        var res = await LN.requestPermissions();
        return res.display === 'granted';
      } catch (e) { return false; }
    }
    if (this.hasWebApi()) {
      try {
        var perm = await Notification.requestPermission();
        return perm === 'granted';
      } catch (e) { return false; }
    }
    return false;
  },

  /* ---- Android : demande directe au lancement de l'APK ---- */
  requestStartupPermission: async function() {
    if (!this.isCapacitor() || this._startupAsked) return false;
    this._startupAsked = true;
    try {
      var LN = this.nativePlugin();
      if (!LN) return false;
      if (LN.checkPermissions) {
        var current = await LN.checkPermissions();
        if (current && current.display === 'granted') return true;
      }
      return await this.requestPermission();
    } catch (e) {
      return false;
    }
  },

  /* ---- Notification immédiate (test / fallback web) ---- */
  fire: async function(title, body) {
    if (this.isCapacitor()) {
      try {
        var LN = this.nativePlugin();
        if (!LN) return;
        await LN.schedule({ notifications: [{
          id: Math.floor(Math.random() * 100000) + 1,
          title: title, body: body,
          schedule: { at: new Date(Date.now() + 500) }
        }]});
      } catch (e) {}
      return;
    }
    if (this.hasWebApi() && Notification.permission === 'granted') {
      try { new Notification(title, { body: body }); } catch(e) {}
    }
  },

  /* ---- Vérifie au chargement si un rappel "web" doit se déclencher
     maintenant (fallback navigateur / Electron, sans planification réelle
     en arrière-plan — l'app doit être ouverte). ---- */
  /* Rappels "intelligents" calculés à partir du cycle :
     - 9001 / 9002 : règles attendues dans 2 jours / aujourd'hui
     - 9004 : règles en cours sans date de fin → « pensez à noter la fin »
     - 9005 : la période fertile commence demain */
  smartReminders: function() {
    var u = getUser(); if (!u) return [];
    var lp = getLastPeriod(); if (!lp) return [];
    var cl = getCycleLen(), today = todayStr(), out = [];
    var next = getNextPeriodDate(lp.start, cl);
    out.push({ id: 9001, date: addDays(next, -2), time: '09:00', body: 'Vos règles sont attendues dans 2 jours.' });
    out.push({ id: 9002, date: next, time: '09:00', body: 'Vos règles sont attendues aujourd\'hui.' });
    var ap = getActivePeriod();
    if (ap && !ap.end) {
      var d = addDays(ap.start, Math.max(3, getEstimatedPeriodDur()));
      out.push({ id: 9004, date: d < today ? today : d, time: '19:00',
                 body: 'Vos règles sont-elles terminées ? Indiquez la date de fin pour garder un calendrier juste.' });
    }
    if (typeof getZoneBounds === 'function') {
      var cs = typeof currentCycleStart === 'function' ? currentCycleStart(lp.start, cl) : lp.start;
      var fert = addDays(cs, getZoneBounds(cl).dangerStart);
      if (addDays(fert, -1) < today) fert = addDays(fert, cl); /* déjà passée → cycle suivant */
      out.push({ id: 9005, date: addDays(fert, -1), time: '19:00', body: 'Votre période fertile commence demain.' });
    }
    return out;
  },

  /* ---- Vérifie au chargement si un rappel "web" doit se déclencher
     maintenant (fallback navigateur / Electron, sans planification réelle
     en arrière-plan — l'app doit être ouverte). ---- */
  checkPendingReminders: function() {
    if (this.isCapacitor() || !this.isEnabled() || !this.hasWebApi()) return;
    if (Notification.permission !== 'granted') return;
    var self = this, today = todayStr(), nowHM = new Date().toTimeString().slice(0, 5);
    var key = 'cyclecare_notif_fired_' + App.data.uid, fired = {};
    try { fired = JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) {}
    this.smartReminders().forEach(function(r) {
      if (r.date !== today || nowHM < r.time || fired[r.id] === today) return;
      self.fire('CycleCare', r.body);
      fired[r.id] = today;
    });
    try { localStorage.setItem(key, JSON.stringify(fired)); } catch (e) {}
  },

  /* ---- Replanifie les rappels NATIFS (Android / Capacitor uniquement).
     Sur le web, il n'y a rien à "planifier" à proprement parler : on se
     contente de vérifier à l'ouverture (checkPendingReminders). ---- */
  /* Annule tous les rappels natifs déjà planifiés (déconnexion, désactivation…) */
  cancelAll: async function() {
    if (!this.isCapacitor()) return;
    try {
      var LN = this.nativePlugin();
      if (LN) await LN.cancel({ notifications: [{ id: 9001 }, { id: 9002 }, { id: 9003 }, { id: 9004 }, { id: 9005 }] });
    } catch (e) {}
  },

  rescheduleAll: async function() {
    if (!this.isCapacitor()) return;
    /* TOUJOURS annuler d'abord : avant, si les notifications étaient
       désactivées on sortait avant l'annulation → les rappels déjà
       planifiés (dont la pilule, quotidienne) continuaient. */
    await this.cancelAll();
    if (!this.isEnabled() || !getUser()) return;
    try {
      var LN = this.nativePlugin();
      if (!LN) return;

      var u = getUser(); if (!u) return;
      var now = new Date();
      var notifs = this.smartReminders().map(function(r) {
        return { id: r.id, title: 'CycleCare', body: r.body, schedule: { at: new Date(r.date + 'T' + r.time + ':00') } };
      }).filter(function(n) { return n.schedule.at > now; });
      if (u.notifPrefs && u.notifPrefs.pillReminder) {
        notifs.push({
          id: 9003, title: 'CycleCare', body: 'N\'oubliez pas votre pilule contraceptive.',
          schedule: { on: { hour: u.notifPrefs.pillHour || 20, minute: 0 }, repeats: true }
        });
      }
      if (notifs.length) await LN.schedule({ notifications: notifs });
    } catch (e) { /* environnement non natif ou plugin indisponible : silencieux */ }
  }
};

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
  checkPendingReminders: function() {
    if (this.isCapacitor() || !this.isEnabled() || !this.hasWebApi()) return;
    if (Notification.permission !== 'granted') return;
    var u = getUser(); if (!u) return;
    var lp = getLastPeriod(); if (!lp) return;
    var cl = getCycleLen();
    var next = getNextPeriodDate(lp.start, cl);
    var daysUntil = diffDays(todayStr(), next);
    var lastFired = (u.notifPrefs && u.notifPrefs.lastFiredDate) || null;
    if (lastFired === todayStr()) return; /* une seule notification web par jour */

    if (daysUntil === 2 || daysUntil === 0) {
      this.fire('CycleCare', daysUntil === 0
        ? 'Vos règles sont attendues aujourd\'hui.'
        : 'Vos règles sont attendues dans 2 jours.');
      updateUser(function(uu) {
        uu.notifPrefs = uu.notifPrefs || {};
        uu.notifPrefs.lastFiredDate = todayStr();
        return uu;
      });
    }
  },

  /* ---- Replanifie les rappels NATIFS (Android / Capacitor uniquement).
     Sur le web, il n'y a rien à "planifier" à proprement parler : on se
     contente de vérifier à l'ouverture (checkPendingReminders). ---- */
  rescheduleAll: async function() {
    if (!this.isCapacitor() || !this.isEnabled()) return;
    try {
      var LN = this.nativePlugin();
      if (!LN) return;
      await LN.cancel({ notifications: [{ id: 9001 }, { id: 9002 }, { id: 9003 }] }).catch(function(){});

      var u = getUser(); if (!u) return;
      var lp = getLastPeriod(); if (!lp) return;
      var cl = getCycleLen();
      var next = getNextPeriodDate(lp.start, cl);
      var twoDaysBefore = addDays(next, -2);
      var now = new Date();
      var notifs = [];

      var atTwoDays = new Date(twoDaysBefore + 'T09:00:00');
      if (atTwoDays > now) {
        notifs.push({ id: 9001, title: 'CycleCare', body: 'Vos règles sont attendues dans 2 jours.', schedule: { at: atTwoDays } });
      }
      var atDueDate = new Date(next + 'T09:00:00');
      if (atDueDate > now) {
        notifs.push({ id: 9002, title: 'CycleCare', body: 'Vos règles sont attendues aujourd\'hui.', schedule: { at: atDueDate } });
      }
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

/* =============================================
   js/files.js — Enregistrer / partager un fichier
   =============================================
   Problème réglé : dans l'APK Android, un lien <a download> ne fait RIEN
   (la WebView ignore les téléchargements de "blob:") → on voyait une
   notification mais aucun fichier n'existait.

   Android (Capacitor) :
     1. le fichier est écrit dans  Documents/CycleCare/  (visible dans
        l'app "Fichiers" du téléphone) grâce à @capacitor/filesystem ;
        si ce dossier est refusé (anciens Android), il est écrit dans le
        cache de l'app ;
     2. une fenêtre indique OÙ il se trouve, avec un bouton
        « Ouvrir / Partager » (@capacitor/share) pour l'ouvrir avec un
        lecteur PDF, l'enregistrer dans Drive, l'envoyer par WhatsApp,
        par email au médecin…
   Web / Windows : téléchargement classique (dossier Téléchargements).
   ============================================= */

var FileSaver = {
  isNative: function() {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  },
  plugin: function(name) {
    return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins[name];
  },

  blobToBase64: function(blob) {
    return new Promise(function(resolve, reject) {
      var r = new FileReader();
      r.onload = function() { resolve(String(r.result).split(',')[1] || ''); };
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  },

  /* Point d'entrée unique : save('rapport.pdf', blob, 'application/pdf', 'Rapport santé')
     → demande OÙ enregistrer (sauf si un choix par défaut est réglé dans Paramètres). */
  save: async function(filename, blob, mime, title) {
    App.state.pendingFile = { name: filename, blob: blob, mime: mime, title: title || filename };
    var pref = this.getPref();
    if (pref === 'pick') return this.saveAs();
    if (pref === 'default') return this.saveDefault();
    openModal('saveChoice');
  },

  /* Préférence : 'ask' (défaut) | 'pick' (toujours choisir le dossier) | 'default' */
  getPref: function() { try { return localStorage.getItem('cyclecare_save_pref') || 'ask'; } catch (e) { return 'ask'; } },
  setPref: function(v) { try { localStorage.setItem('cyclecare_save_pref', v); } catch (e) {} showToast('Préférence enregistrée.'); },
  defaultPlaceLabel: function() { return this.isNative() ? 'Documents › CycleCare' : 'Téléchargements'; },

  /* 1) « Choisir le dossier… » : sélecteur système */
  saveAs: async function() {
    var f = App.state.pendingFile; if (!f) return;
    if (this.isNative()) {
      var SA = this.plugin('SaveAs');
      if (!SA) { showToast('Mise à jour de l\'application nécessaire (plugin « Enregistrer sous »).', 'err'); return; }
      try {
        var res = await SA.save({ filename: f.name, mimeType: f.mime, data: await this.blobToBase64(f.blob) });
        if (!res || !res.saved) { showToast('Enregistrement annulé.', 'warn'); return; }
        App.state.lastFile = { name: f.name, uri: res.uri, mime: f.mime, title: f.title, where: 'picked' };
        openModal('fileSaved');
      } catch (e) { console.error(e); showToast('Impossible d\'enregistrer à cet endroit.', 'err'); }
      return;
    }
    /* Ordinateur / navigateur : boîte « Enregistrer sous » si disponible */
    if (window.showSaveFilePicker) {
      try {
        var ext = (f.name.split('.').pop() || '').toLowerCase();
        var handle = await window.showSaveFilePicker({ suggestedName: f.name,
          types: [{ description: f.title, accept: (function(o) { o[f.mime] = ['.' + ext]; return o; })({}) }] });
        var w = await handle.createWritable(); await w.write(f.blob); await w.close();
        closeModal(); showToast('Fichier enregistré : ' + handle.name);
      } catch (e) {
        if (e && e.name === 'AbortError') { showToast('Enregistrement annulé.', 'warn'); return; }
        console.warn(e); this.download(f.name, f.blob); closeModal();
        showToast('Fichier enregistré dans Téléchargements : ' + f.name);
      }
      return;
    }
    this.download(f.name, f.blob); closeModal();
    showToast('Fichier enregistré dans Téléchargements : ' + f.name);
  },

  /* 2) Emplacement par défaut */
  saveDefault: async function() {
    var f = App.state.pendingFile; if (!f) return;
    if (this.isNative()) return this.saveNative(f.name, f.blob, f.mime, f.title);
    this.download(f.name, f.blob); closeModal();
    showToast('Fichier enregistré dans Téléchargements : ' + f.name);
  },

  /* 3) Partager directement (WhatsApp, email, Drive…) */
  shareNow: async function() {
    var f = App.state.pendingFile; if (!f) return;
    if (this.isNative()) {
      var FS = this.plugin('Filesystem');
      if (!FS) { showToast('Mise à jour de l\'application nécessaire pour partager.', 'err'); return; }
      try {
        await FS.writeFile({ path: f.name, data: await this.blobToBase64(f.blob), directory: 'CACHE' });
        var uri = (await FS.getUri({ path: f.name, directory: 'CACHE' })).uri;
        App.state.lastFile = { name: f.name, uri: uri, mime: f.mime, title: f.title, where: 'share' };
        closeModal();
        await this.share();
      } catch (e) { console.error(e); showToast('Partage impossible.', 'err'); }
      return;
    }
    try {
      var file = new File([f.blob], f.name, { type: f.mime });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: f.title }); closeModal(); return;
      }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    showToast('Le partage n\'est pas disponible ici : le fichier est téléchargé.', 'warn');
    this.download(f.name, f.blob); closeModal();
  },

  download: function(filename, blob) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 4000);
  },

  saveNative: async function(filename, blob, mime, title) {
    var FS = this.plugin('Filesystem');
    if (!FS) {
      showToast('Mise à jour de l\'application nécessaire pour enregistrer des fichiers.', 'err');
      return;
    }
    var data = await this.blobToBase64(blob);
    var saved = null;
    /* 1) Dossier public Documents/CycleCare */
    try {
      await FS.writeFile({ path: 'CycleCare/' + filename, data: data, directory: 'DOCUMENTS', recursive: true });
      saved = { directory: 'DOCUMENTS', path: 'CycleCare/' + filename };
    } catch (e) {
      console.warn('Documents indisponible, repli sur le cache :', e);
    }
    /* 2) Repli : cache de l'application (toujours autorisé) */
    if (!saved) {
      try {
        await FS.writeFile({ path: filename, data: data, directory: 'CACHE' });
        saved = { directory: 'CACHE', path: filename };
      } catch (e2) {
        console.error(e2);
        showToast('Impossible d\'enregistrer le fichier sur cet appareil.', 'err');
        return;
      }
    }
    var uri = '';
    try { uri = (await FS.getUri(saved)).uri; } catch (e3) {}
    App.state.lastFile = {
      name: filename, uri: uri, mime: mime, title: title || filename,
      where: saved.directory === 'DOCUMENTS' ? 'documents' : 'cache'
    };
    openModal('fileSaved');
  },

  share: async function() {
    var f = App.state.lastFile; if (!f) return;
    var Share = this.plugin('Share');
    if (!Share || !f.uri) { showToast('Ouvrez le fichier depuis l\'application « Fichiers » du téléphone.', 'warn'); return; }
    try {
      await Share.share({ title: f.title, url: f.uri, dialogTitle: 'Ouvrir ou envoyer : ' + f.name });
    } catch (e) { /* partage annulé par l'utilisatrice */ }
  }
};

/* Choix de l'emplacement */
function mSaveChoice() {
  var f = App.state.pendingFile || {};
  var row = function(ico, lbl, sub, fn) {
    return '<button class="plus-row" onclick="' + fn + '"><div class="item-icon item-icon-pink"><i class="ti ' + ico + '" aria-hidden="true"></i></div>'
      + '<div style="flex:1;min-width:0;text-align:left;"><div class="item-label">' + lbl + '</div><div class="item-sub">' + sub + '</div></div>'
      + '<i class="ti ti-chevron-right" style="color:var(--text-3);" aria-hidden="true"></i></button>';
  };
  return mTitle('ti-folder', 'Où enregistrer ?')
    + '<div style="font-size:13px;color:var(--text-2);margin-bottom:10px;word-break:break-all;"><i class="ti ti-file-text" aria-hidden="true"></i> ' + esc(f.name || '') + '</div>'
    + '<div class="card" style="padding:2px 12px;">'
    + row('ti-folder-search', 'Choisir le dossier…', 'Téléchargements, Documents, carte SD, Google Drive…', 'FileSaver.saveAs()')
    + row('ti-folder-down', FileSaver.defaultPlaceLabel(), 'Emplacement par défaut, en un geste', 'FileSaver.saveDefault()')
    + row('ti-share', 'Partager / envoyer', 'WhatsApp, email au médecin, Drive…', 'FileSaver.shareNow()')
    + '</div>'
    + '<div style="font-size:12px;color:var(--text-3);margin:4px 2px 0;">Vous pouvez choisir un emplacement par défaut dans Paramètres › Données personnelles.</div>'
    + '<div class="modal-footer"><button class="btn btn-outline" style="flex:1;" onclick="closeModal()">Annuler</button></div>';
}

/* Fenêtre affichée après un enregistrement sur Android */
function mFileSaved() {
  var f = App.state.lastFile || {};
  var where = f.where === 'documents'
    ? '<strong>Documents › CycleCare</strong><br><span style="font-size:12px;color:var(--text-3);">Ouvrez l\'application « Fichiers » (ou « Mes fichiers ») de votre téléphone, puis Documents › CycleCare.</span>'
    : f.where === 'picked'
    ? '<strong>Dans le dossier que vous avez choisi.</strong><br><span style="font-size:12px;color:var(--text-3);">Retrouvez-le avec l\'application « Fichiers » de votre téléphone.</span>'
    : '<span style="font-size:12px;color:var(--text-3);">Le fichier est prêt. Utilisez « Ouvrir / Partager » pour l\'ouvrir, l\'enregistrer dans vos fichiers ou Google Drive, ou l\'envoyer.</span>';
  return mTitle('ti-circle-check', 'Fichier enregistré')
    + '<div class="card card-sm" style="display:flex;gap:10px;align-items:flex-start;">'
    + '<i class="ti ti-file-text" style="font-size:26px;color:var(--primary);flex-shrink:0;" aria-hidden="true"></i>'
    + '<div style="min-width:0;"><div style="font-weight:600;word-break:break-all;">' + esc(f.name || '') + '</div>'
    + '<div style="font-size:13px;margin-top:6px;line-height:1.45;">' + where + '</div></div></div>'
    + '<div class="modal-footer">'
    + '<button class="btn btn-outline" style="flex:1;" onclick="closeModal()">Fermer</button>'
    + '<button class="btn btn-primary" style="flex:1;" onclick="FileSaver.share()"><i class="ti ti-share" aria-hidden="true"></i> Ouvrir / Partager</button>'
    + '</div>';
}

/* Réglage dans Paramètres */
function renderSavePrefRow() {
  var p = FileSaver.getPref();
  var opt = function(v, l) { return '<option value="' + v + '"' + (p === v ? ' selected' : '') + '>' + l + '</option>'; };
  return settingsRow('ti-folder', 'Emplacement des fichiers', 'Où enregistrer les rapports et exports',
    '<select class="inp inp-sm" onchange="FileSaver.setPref(this.value)" aria-label="Emplacement des fichiers">'
    + opt('ask', 'Demander à chaque fois') + opt('pick', 'Choisir le dossier') + opt('default', FileSaver.defaultPlaceLabel()) + '</select>');
}

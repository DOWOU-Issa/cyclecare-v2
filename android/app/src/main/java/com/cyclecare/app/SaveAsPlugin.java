package com.cyclecare.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;

/**
 * « Enregistrer sous… » : ouvre le sélecteur de fichiers d'Android
 * (Storage Access Framework) pour que l'utilisatrice choisisse le dossier
 * (Téléchargements, Documents, carte SD, Google Drive…) et le nom du fichier.
 * Aucune permission de stockage n'est nécessaire.
 *
 * JS : Capacitor.Plugins.SaveAs.save({ filename, mimeType, data (base64) })
 *      → { saved: true, uri } ou { saved: false } si annulé
 */
@CapacitorPlugin(name = "SaveAs")
public class SaveAsPlugin extends Plugin {

    private String pendingData;

    @PluginMethod
    public void save(PluginCall call) {
        String filename = call.getString("filename", "cyclecare.pdf");
        String mime = call.getString("mimeType", "application/octet-stream");
        pendingData = call.getString("data");
        if (pendingData == null) {
            call.reject("Aucune donnée à enregistrer");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mime);
        intent.putExtra(Intent.EXTRA_TITLE, filename);
        startActivityForResult(call, intent, "onDocumentCreated");
    }

    @ActivityCallback
    private void onDocumentCreated(PluginCall call, ActivityResult result) {
        if (call == null) return;
        JSObject ret = new JSObject();
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            ret.put("saved", false);
            pendingData = null;
            call.resolve(ret);
            return;
        }
        Uri uri = result.getData().getData();
        try (OutputStream out = getContext().getContentResolver().openOutputStream(uri)) {
            if (out == null) throw new Exception("Flux d'écriture indisponible");
            out.write(Base64.decode(pendingData, Base64.DEFAULT));
            out.flush();
            ret.put("saved", true);
            ret.put("uri", uri.toString());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Écriture impossible : " + e.getMessage());
        } finally {
            pendingData = null;
        }
    }
}

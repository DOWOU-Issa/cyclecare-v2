package com.cyclecare.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugin maison « Enregistrer sous… » (choix du dossier par l'utilisatrice)
        registerPlugin(SaveAsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

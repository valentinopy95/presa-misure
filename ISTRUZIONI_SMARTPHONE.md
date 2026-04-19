# Guida: Sviluppare l'app dallo smartphone

## Connessione SSH (da qualsiasi rete)

**App richiesta:** Termius (Play Store)

**Configurazione host in Termius:**
- Hostname: `100.105.200.81` (IP Tailscale — funziona ovunque)
- Port: `22`
- Username: `valen`
- Authentication: chiave `PC valen` (file `termius_key.pem` nella cartella Download)
- Start command: `claude` ← parte automaticamente Claude Code

> Se sei sulla rete di casa puoi usare anche `192.168.1.103` come hostname.

---

## Una volta connesso

Vai nella cartella dell'app:
```
cd "C:\Users\valen\Desktop\app presa misure\MeasureApp"
```

Avvia Claude Code (se non parte automaticamente):
```
claude
```

Da lì descrivi le modifiche da fare — Claude le implementa e rebuilda l'app.

---

## Buildare e installare l'app sul telefono

**Requisito:** telefono connesso allo stesso WiFi del PC (ADB WiFi).

Comando di build (da eseguire nella cartella dell'app):
```
JAVA_HOME="C:/Program Files/Android/Android Studio/jbr" ANDROID_SERIAL="192.168.1.110:5555" npx expo run:android --no-bundler
```

Se il telefono non risponde via ADB (es. dopo riavvio del telefono), collega il cavo USB una volta e poi:
```
adb tcpip 5555
adb connect 192.168.1.110:5555
```

---

## ADB WiFi automatico

Il PC si riconnette automaticamente al telefono via ADB ad ogni avvio (Task Scheduler).
Script: `C:\Users\valen\adb_autoconnect.ps1`
Log: `C:\Users\valen\adb_autoconnect.log`

---

## Note importanti

- **IP telefono fisso:** `192.168.1.110` — impostato come IP statico nel WiFi del telefono
- **IP PC Tailscale:** `100.105.200.81` — non cambia mai
- **SSH service:** si avvia automaticamente con Windows
- **Tailscale:** si avvia automaticamente con Windows

---

## Repository GitHub

`https://github.com/valentinopy95/presa-misure`

```
git pull origin master   # scarica ultime modifiche
git push origin master   # carica modifiche
```

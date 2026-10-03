# Tutor — imparare l'inglese davvero (A0 → B2)

App mobile per italiani che vogliono usare l'inglese, non solo completare lezioni.
Metodo: **spiega → mostra → fammi provare → correggi → ripeti → usa**.

Questa prima versione copre **A0 e A1** ed è un'app Expo (iOS, Android e web) con un piccolo server opzionale che collega il tutor a Claude.

## Cosa c'è

| Area | Cosa fa |
|---|---|
| Onboarding | 6 domande + test di livello adattivo (o "parto da zero"), obiettivo, prima mini-lezione |
| Oggi | Messaggio del tutor basato su ripassi ed errori, livello reale, streak (solo giorni con risposte giuste), lezione in base al tempo che hai (5–40 min) |
| Lezione | Spiegazione semplice con confronto italiano/inglese, esempi con audio, esercizi in 3 livelli (riconosci → guidato → libero), uso in conversazione |
| Correzioni | "Hai scritto / La forma corretta è / Perché?" e subito un esercizio sullo stesso errore |
| Aiutami | Non ho capito · Fammi un esempio · Spiegamelo in italiano · Fammi riprovare |
| Parla | 6 situazioni (bar, presentarsi, ristorante, hotel, aeroporto, negozi) e "Parla con me"; correzioni solo alla fine 🔴🟡🟢 |
| I miei errori | 12 errori tipici degli italiani, riconosciuti automaticamente; da imparare → in miglioramento → acquisito (giusto in 3 giorni diversi) |
| Ripasso | Ripetizione dilazionata (FSRS) per argomenti, parole, verbi ed errori |
| Vocaboli e verbi | ~80 parole in 10 temi e 32 verbi, con pronuncia IPA, pronuncia "all'italiana", esempi e audio |
| Progressi | Un argomento è "acquisito" solo se lo ricordi dopo almeno 7 giorni e lo usi da solo; se lo dimentichi torna "da rinforzare" |
| Il tuo tutor | Cosa l'app sa di te, traguardi reali, diario delle tue frasi |

## Provarla

```bash
npm install
npm run web        # nel browser
npx expo start     # poi apri con Expo Go sul telefono (QR code)
```

Senza server l'app funziona interamente offline: conversazioni a copione e correzioni basate su regole.

### Collegare il tutor a Claude (facoltativo)

```bash
cd server
npm install
cp .env.example .env    # inserisci ANTHROPIC_API_KEY
npm start               # http://localhost:8787
```

Poi nella cartella principale crea `.env` da `.env.example` con `EXPO_PUBLIC_TUTOR_API_URL` che punta al server e riavvia Expo.
La chiave API resta solo sul server. Il server riceve un riassunto del profilo (livello, errori frequenti, parole recenti), mai l'intero database.

## Struttura

```
src/
  app/          schermate (expo-router): onboarding, (tabs), sessione, conversazione, vocaboli, verbi, profilo
  content/      contenuti A0-A1: argomenti, errori tipici, vocaboli, verbi, scenari, test di livello
  engine/       checker (correzione), srs (FSRS), model (progressi e padronanza), composer (lezione del giorno), store
  ai/           client del tutor con fallback offline
  components/   UI e componente esercizio
server/         API Node: /api/converse e /api/explain con output JSON strutturato
tests/          test del motore (npm test)
```

## Comandi utili

```bash
npm test            # test del motore di apprendimento
npm run typecheck   # controllo dei tipi
```

## Limiti di questa versione

- Il microfono funziona nel browser (Chrome); su telefono per ora si scrive o si usa la dettatura della tastiera.
- La valutazione della pronuncia non è ancora attiva.
- Contenuti A2–B2 da scrivere.
- I dati restano sul dispositivo (nessun account né sincronizzazione).

# Agmenta Holding AB

Designförslag för [agmenta.se](https://agmenta.se/). En sida med Hem, Om Agmenta, Hur vi jobbar och Kontakt, ett kontaktformulär och investeringsintervallen som diagram. All text kommer ordagrant från nuvarande agmenta.se.

Det här är en demo, inte Agmenta Holding ABs officiella webbplats. På GitHub Pages (https://intealma.github.io/agmenta/) märks sidan Demo, visas inte i sökmotorer och formuläret skickar ingenting. Demoläget slås bara på för github.io, så samma filer fungerar på agmenta.se.

## Visa demon lokalt

```bash
python3 dev_server.py
```

Öppna http://localhost:8085. Formuläret fungerar lokalt och sparar förfrågningar i `leads/leads.php`.

## Publicera på webbhotellet (Loopia, PHP)

1. Ladda upp alla filer utom `dev_server.py` och `README.md`.
2. `send.php` tar emot formuläret, sparar varje förfrågan i `leads/leads.php` och mejlar Andreas och Magnus direkt. Svara-knappen i mejlet går till den som skickade.
3. Förfrågningarna läses via FTP. `leads.php` börjar med `<?php exit; ?>`, så den visar en tom sida om någon öppnar den i webbläsaren, och `leads/.htaccess` stänger mappen där servern läser den filen.
4. Avsändaren `webb@agmenta.se` (överst i `send.php`) bör finnas på domänen, annars kan mejlen hamna i skräpposten.
5. Formuläret sparar personuppgifter, så sajten behöver en integritetspolicy innan den går live.

## Att kolla med Agmenta

- Magnus telefonnummer står som `+46 (0) 486 73 15` på nuvarande sajt och verkar sakna siffror.
- Foton i högre upplösning. Nuvarande bilder är 1300 px breda. Torgbilden överst har uppskalats till 2600 px, Linköpingsbilden är originalet.

# Lietuvos oro pavojus (LT72) – Home Assistant

![Oro pavojaus ikona](icon.svg)

Neoficiali Home Assistant integracija ir interaktyvus Lietuvos **oro pavojaus žemėlapis**. Duomenys imami iš [oficialios LT72 svetainės](https://lt72.lt/).

## Galimybės

- Tikras Lietuvos žemėlapis su visų **10 apskričių ribomis**, be iframe ir išorinių puslapių įterpimo.
- Apskritys automatiškai nuspalvinamos pagal paskutinį LT72 paskelbtą pranešimą: **raudona, geltona, geltona po raudonos, balta**, o ten, kur įrašo nėra – **pilka**.
- Spustelėjus apskritį parodoma paskelbta būsena ir paskelbimo laikas.
- Nuosava **oro pavojaus skydo ikona**.
- Diegimo metu pasirenkama viena apskritis, kurios atskiras HA sensorius taip pat rodo visų apskričių duomenis atributuose.
- Apskritį galima pakeisti per integracijos **Configure**.
- Automatinis duomenų tikrinimas kas **60 sekundžių**.

## HACS diegimas

1. HACS → meniu ⋮ → **Custom repositories**.
2. Pridėkite `https://github.com/braticks/lt72-air-alert` kaip **Integration**.
3. Įdiekite (jei jau įdiegta, rinkitės **Redownload / Update**).
4. **Perkraukite Home Assistant**.
5. Settings → Devices & services → **Add integration** → **Lietuvos oro pavojus (LT72)**.
6. Per UI pasirinkite norimą apskritį (pvz., Kauno).

Šioje integracijoje Lovelace kortos JS modulis paprastai užregistruojamas automatiškai. Jei naudojate YAML režimo Lovelace resursus, pridėkite modulį rankiniu būdu per Dashboard → Resources:

```text
/lt72_air_alert/lt72-air-alert-map.js?v=0.2.0
```

## Oro pavojaus žemėlapio korta

Dashboard → Edit → Add card → Manual (YAML):

```yaml
type: custom:lt72-air-alert-map
title: Oro pavojus Lietuvoje
region: kauno
```

`region` yra pasirinktinė paryškinama apskritis, **ne duomenų filtras**: žemėlapyje matomos visos apskritys.

Jei automatiškai neaptinkamas LT72 sensorius, jo entity ID galite įrašyti patys:

```yaml
type: custom:lt72-air-alert-map
entity: sensor.oro_pavojus_kauno_apskritis
region: kauno
```

`entity` ID yra pavyzdinis; tikslų rasite Developer tools → States.

Visų apskričių būsenos laikomos sensoriaus `apskritys` atribute; sensoriaus pagrindinė būsena rodo per UI pasirinktą apskritį.

## Naudojami šaltiniai

- Perspėjimai: [LT72](https://lt72.lt/).
- Žemėlapio apskričių ribos: [govlt/powerbi-map-lt](https://github.com/govlt/powerbi-map-lt/blob/main/topojson/LT-apskritys-districts.json).
- Visa geometrija pateikta integracijoje; kortai nereikia jungtis prie trečiųjų šalių žemėlapių servisų.

## Saugumas

Tai **ne oficialus ir ne garantuotai realaus laiko perspėjimų kanalas**: svetainės struktūra gali pasikeisti, o duomenys gali būti pavėluoti. **Pilka / Nepaskelbta** nėra saugumo patvirtinimas. **Balta** rodoma tik tada, kai LT72 aiškiai paskelbia būseną BALTA. Kai sensorius nepasiekiamas, korta nerodo senos būsenos kaip patikimos.

Esant pavojui vadovaukitės **LT-Alert, sirenomis ir oficialiais institucijų perspėjimais**. [LT72 rekomendacijos](https://lt72.lt/rekomendacijos-oro-pavojaus-atveju-2/).

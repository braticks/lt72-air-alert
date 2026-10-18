# Lietuvos oro pavojus (LT72)

Neoficiali Home Assistant integracija. Rodo [LT72](https://lt72.lt/) svetainėje paskelbtą oro pavojaus būseną **pasirinktai Lietuvos apskričiai**.

## Galimybės

- Visos 10 Lietuvos apskričių: pasirinkimas per Home Assistant UI.
- Apskrities keitimas per integracijos **Configure**.
- Sensoriumi rodomos būsenos: **Raudona**, **Geltona**, **Geltona po raudonos**, **Balta**, **Nepaskelbta**.
- Paskelbimo laikas, apskritis ir LT72 nuoroda kaip sensoriaus atributai.
- Duomenys tikrinami kas 60 sekundžių.

## Diegimas per HACS

1. HACS → **Custom repositories**.
2. URL: `https://github.com/braticks/lt72-air-alert`.
3. Category: **Integration** → **Download**.
4. Perkraukite Home Assistant.
5. Settings → Devices & services → Add integration → **Lietuvos oro pavojus (LT72)**.
6. Pasirinkite apskritį (pvz., **Kauno apskritis**).

Pakeisti apskritį: Settings → Devices & services → Lietuvos oro pavojus → **Configure**.

### Rankinis diegimas

Nukopijuokite `custom_components/lt72_air_alert` katalogą į HA `config/custom_components/` ir perkraukite HA.

## Saugumas ir patikimumas

**Šaltinis:** viešas LT72 pranešimų sąrašas. Tai nėra garantuota API – pasikeitus tinklalapiui, integracija gali nustoti veikti. Tinklalapio / tinklo klaidos atveju būsena tampa `unavailable`.

**Nepaskelbta** reiškia, kad šiuo metu LT72 suvestinėje nėra aiškiai paskelbtos būsenos pasirinktai apskričiai; **tai nereiškia, kad nėra pavojaus**. **Balta** rodoma tik esant aiškiam atšaukimo įrašui. Ši integracija nėra oficiali perspėjimo sistema – remkitės oficialiais LT-Alert, sirenų ir institucijų perspėjimais.

[LT72: ką daryti oro pavojaus metu](https://lt72.lt/rekomendacijos-oro-pavojaus-atveju/)

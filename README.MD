IDEJA:
Sistem za najemodajalce, ki omogoča spremljanje plačevanja stroškov. Najemodajalcem omogoča pregled vseh njihovih nepremičnin ter najemnikov, prijavljenih na posameznih naslovih. Prav tako lahko vidijo, koliko mora vsak posamezen naslov plačati ter kakšni so stroški (npr. voda, elektrika). Najemodajalec lahko vidi tudi skupni znesek stroškov, ki jih mora poravnati v določenem mesecu.
Sistem omogoča tudi enostavno upravljanje podatkov o najemnikih in nepremičninah. Vsak najemnik ima pregled nad svojimi mesečnimi obveznostmi in lahko preveri, ali so stroški že poravnani. Sistem lahko shranjuje zgodovino plačil, kar omogoča pregled preteklih stroškov in plačil. Takšna rešitev olajša organizacijo podatkov ter izboljša preglednost nad financami povezanimi z oddajanjem nepremičnin.

MIKROSTORITVE:

Uporabniki
Opis: Upravljanje podatkov o najemodajalcih in najemnikih. Omogoča registracijo, prijavo, urejanje profila in avtorizacijo za dostop do podatkov o nepremičninah in plačilih.

Primeri endpointov:
POST /users/register – registracija novega uporabnika
POST /users/login – prijava uporabnika
GET /users/{id} – pridobitev podatkov uporabnika
PUT /users/{id} – posodobitev podatkov uporabnika

Nepremičnine
Opis: Upravljanje nepremičnin, ki jih najemodajalec oddaja. Vključuje dodajanje novih nepremičnin, urejanje obstoječih ter pregled najemnikov, prijavljenih na posameznih naslovih.

Primeri endpointov:

POST /properties – dodajanje nove nepremičnine
GET /properties – seznam vseh nepremičnin uporabnika
GET /properties/{id} – podrobnosti o posamezni nepremičnini
PUT /properties/{id} – posodobitev podatkov nepremičnine

Plačila
Opis: Upravljanje plačil za posamezne nepremičnine in najemnike. Omogoča beleženje plačil, izračun stroškov (voda, elektrika) in pregled, koliko mora posamezen najemnik ali najemodajalec plačati.

Primeri endpointov:

POST /payments – vnos novega plačila
GET /payments?propertyId={id} – pregled plačil za posamezno nepremičnino
GET /payments/{id} – podrobnosti o posameznem plačilu
PUT /payments/{id} – posodobitev stanja plačila

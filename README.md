# WeerBericht - Interactieve Single Page Aplication

## Project Overzicht
Weerbericht is een webaplicatie gemaakt door Simon Beelen voor het vak Web Advanced. Het maakt gebruik van de api open-meteo om actuele weerdata te geven. De gebruiker kan filteren tussen verschillende weerdata zoals luchtdruk, temperatuur en nog veel meer. Verder is er ook nog de mogelijkheid om te kijken op een kaart waar dat je je bevindt, weervoorspellingen voor de komende 7 dagen en een functie om favorieten plaatsen toe te voegen. 

## Functionaliteiten
### Data verzameling en weergave
- Haalt actuele weergegevens en voorspellingen op via Open-Meteo
- Visuele presentatie van de huidge weerdata: huidige weeromstandigheden, temperatuur en voorspellingen
- Overzichtelijke layout met verschillende containers (kaart, basisinfo, extra info)

### Interactiviteit
- Zoekfuncties om locatie te zoeken
- Filtreren op verschillende weerdata
- Sorteren van favorieten
- Interactieve kaart

### Personalisatie
- Opslaan van favorieten in LocalStorage zodat ze behouden blijven tussen sessies
- Thema switcher: dark en light mode
- Personalisatie (filters) wordt bijgehouden
- Aanpasbare weerinfo weergave
  
### Gebruikservaring
- Responsive design voor GSM, Desktop en tablet
- Visueel aantrekkelijk en overzichtelijke interface
- Simpele navigatie tussen de verschillende functies
- Animaties bij knopen en bij hover
  
### Gebruikte API's
- **Open-Meteo API**: https://open-meteo.com/
  * Current Weather API
  * Forecast API
  * Geocoding API
- **OpenStreetMap**: Voor kaart tiles via Leaflet
- **Leaflet**: Voor interactieve kaarten
  
## Technische Implementatie 
Ook toevoeging van screenshots waarin deze vereiste werden gevraagd. Disclaimer er is altijd enkel één voorbeeld gekozen, dus er kunnen meerdere codes zijn die deze elementen bevatten.
### DOM Manipulatie
- **Elementen selecteren**: document.getElementById(), document.querySelectorAll() main.js 7-20
  
  ![image](https://github.com/user-attachments/assets/8b17dbb2-a9f2-4ac8-8805-04f9a187169d)
  
- **Elementen manipuleren**: main.js 571 - 581
  
  ![image](https://github.com/user-attachments/assets/fd256d64-24c8-41d0-a199-1122785f5d47)
- **Event Listener**s: Click, submit, change events main.js 588 - 605
  
  ![image](https://github.com/user-attachments/assets/8920d18a-c6dc-4e8f-a40f-03b818bbecb7)
  
### Modern Javascript
- **Gebruik van constanten**
  ![image](https://github.com/user-attachments/assets/c06626d7-979d-449c-a5aa-d5753468d4b7)
  
- **Template Literals**
  
  ![image](https://github.com/user-attachments/assets/56b2c0d1-6b15-40cd-aa72-1edbe47b0d86)
  
- **Array Methodes, Arrow Functions en Iteratie over Array**
  ![image](https://github.com/user-attachments/assets/d4f53d8d-b81d-4547-a5ff-ef8322dcc241)
  
- **Conditional (ternary) operator (moderne if,else)**
  ![image](https://github.com/user-attachments/assets/642f681c-3392-4236-ae69-16381932ab80)
  
- **Callback Functions, intersection observer**:
  
  ![image](https://github.com/user-attachments/assets/c10890b4-3833-4d16-b762-85c5598f1306)
  
- **Promises, Async en Await**:
  ![image](https://github.com/user-attachments/assets/2abd5cb1-1422-411f-a30e-aa1f3f62bcd8)

### Data en API
- **Data Fetch**
  ![image](https://github.com/user-attachments/assets/2046dadd-f8c4-4ef4-9fc8-2092a9eb0c86)
  
- **JSON Manipulatie**
  
  ![image](https://github.com/user-attachments/assets/c961c05f-60ee-452d-be7f-ea5efea5faa6)
  
### Opslag en Validatie
- **Formulier validatie**
  ![image](https://github.com/user-attachments/assets/ba88467d-f317-4fca-88b2-687ed1618d92)
  
- **Localstorage**
- 
  ![image](https://github.com/user-attachments/assets/7a3044b3-42d7-49c1-8736-377dc32d7555)

### HTML 
- index.html

### CSS
- Styles.css

## **Installatie**
### **Vereisten**
- Node.js (versie 14+) https://nodejs.org/
- NPM 
- Git  (https://git-scm.com/

### **Stappen**

**1. Clone de repository**

    1. Open de Terminal/Comand Prompt 
    
        * git clone https://github.com/simonbeelen/simonbeelen.github.io.git
        
    2. Ga naar de project folder
    
        * cd simonbeelen.github.io
        
**2. Dependencies installeren**

  1. Installeer alle nodige packages

       * npm install
    
**3. Opstarten Productie Build en deployment**

  1. Build de applicatie en bekijk een preview

       * npm run build
         
       * npm run preview
         
## **Fotos App**
* [foto's desktop in white theme](https://github.com/simonbeelen/simonbeelen.github.io/tree/39f499ac2882f15c5f39bffed38462f0cb01e43b/screenshots/White%20Mode%20Desktop)
* [foto's desktop in dark theme](https://github.com/simonbeelen/simonbeelen.github.io/tree/39f499ac2882f15c5f39bffed38462f0cb01e43b/screenshots/Dark%20Mode%20Desktop)

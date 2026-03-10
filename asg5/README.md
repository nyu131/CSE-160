# CSE160 – Assignment 5: Three.js  
This project creates a 3D Monopoly-inspired board world using **Three.js**.  
The scene includes a modeled game board, animated objects, lighting controls, and imported 3D assets to create an interactive environment.

---

## Features
- Fully modeled **Monopoly-style board**
- **Animated rolling dice**
- **Rotating Monopoly coin**
- **Skybox environment**
- **Dynamic lighting system**
  - Ambient lighting controls
  - Dice spotlight
  - Adjustable sun (directional light) with XYZ controls
- **Blackout control**
- **Interactive camera orbit controls**
- **Custom 3D models placed on the board**
  - Monopoly Car
  - Monopoly Ship
  - Mr. Monopoly

---

## Extras
- Houses and Hotels follow game rules.
    - Buildings must be placed evenly across properties of the same color group.
    - This means you cannot build multiple houses on one property while the others in the group have fewer.
    - For example, you must build 1 house on each property before adding a second house to any of them.
    - Hotels are only placed after a property has four houses.
        - They're also not placed at exact coordinates to mimic real game placements (more to the left, more to the right, etc.)
- Chance and Community Chest Card Stack
    - "Messy" stack to mimic real life boards where small movements typically cause those cards to misalign
- Monopoly Game Pieces
    - The car, ship, and Mr. Monopoly himself were placed to mimic actual players
    - Mr. Monopoly is also in jail!!!
- Lamps
    - Give it more atmosphere
- Rotating Coin
    - It's a Monopoly Coin!
- Dice Rolling
    - Animated to roll
    - Added a spotlight to the dice for dramatic effects as it's a significant mechanic of the game (turn the spotlight to max and sunlight down to 0!)
- Properties
    - Everything is properly named
    - Everything is properly priced

---

## Controls
- **Mouse drag:** Rotate camera  
- **Scroll wheel:** Zoom  

---

## Acknowledgments
This project was developed following the three.js manual. Additional assistance was provided by **ChatGPT**, which was used as a learning and debugging aid for understanding Three.js concepts and implementing additional features.

---

## 3D Model Credits

**Monopoly Car**  
https://skfb.ly/oz9Jp  
By UlissesVinicios  
Licensed under Creative Commons Attribution 4.0  
http://creativecommons.org/licenses/by/4.0/

**Monopoly Ship**  
https://skfb.ly/oz9JE  
By UlissesVinicios  
Licensed under Creative Commons Attribution 4.0  
http://creativecommons.org/licenses/by/4.0/

**Mr. Monopoly Man (3D Model)**  
https://skfb.ly/pspJt  
By TV Animations Cyprus  
Licensed under Creative Commons Attribution 4.0  
http://creativecommons.org/licenses/by/4.0/

// js/GameConfig.js

// === 1. CALCUL DU SCALING (Adapté de ton code Java) ===
const GAME_WIDTH = 1000;
const GAME_HEIGHT = 750;

// En Java tu utilises Toolkit. En JS, c'est window.
const screenWidth = window.innerWidth;
const screenHeight = window.innerHeight;

// Ton algorithme Java : 95% largeur, 80% hauteur
const scaleX = (screenWidth * 0.99) / GAME_WIDTH;
const scaleY = (screenHeight * 0.98) / GAME_HEIGHT;

// On prend le plus petit ratio pour garder les proportions
const SCALE = Math.min(scaleX, scaleY);

// === 2. EXPORT DE LA CONFIGURATION ===
export const GameConfig = {
    // === DIMENSIONS LOGIQUES ===
    GAME_WIDTH: GAME_WIDTH,
    GAME_HEIGHT: GAME_HEIGHT,
    SCALE: SCALE,

    // Dimensions réelles (en pixels sur l'écran)
    WINDOW_WIDTH: Math.floor(GAME_WIDTH * SCALE),
    WINDOW_HEIGHT: Math.floor(GAME_HEIGHT * SCALE),

    // === MONDE ===
    WORLD_WIDTH: 5000,
    // En Java: GAME_HEIGHT - 100
    GROUND_Y: GAME_HEIGHT - 100, 

    // === JOUEUR ===
    PLAYER_SIZE: 32,
    USE_SPRITE: false,

    // === PHYSIQUE (Valeurs exactes de ton Java) ===
    // Note: En JS (60fps), le jeu sera un peu plus rapide qu'en Java (50fps)
    // Si c'est trop rapide, réduis ces valeurs de 20% (ex: Gravity 0.7)
    GRAVITY: 0.9,
    MOVE_SPEED: 4.0,
    JUMP_VELOCITY: -15.0,
    
    // Wall Jump
    WALL_SLIDE_SPEED: 2.0,
    WALL_JUMP_VELOCITY_X: 10.0,
    WALL_JUMP_VELOCITY_Y: -13.0,
    WALL_JUMP_FRAMES: 8,

    // === CAMÉRA ===
    CAMERA_MIN_Y: -5000,
    // En Java: GROUND_Y + 50. On recrée le calcul ici.
    CAMERA_MAX_Y: (GAME_HEIGHT - 100) + 50, 

    // === JEU ===
    FPS: 60, // Le web tourne nativement à 60.
    COUNTDOWN_DURATION: 3,

    // === MOB WALKER ===
    WALKER_JUMP_VELOCITY: -10.0,
    JUMP_DISTANCE_THRESHOLD: 50.0,
    JUMP_HEIGHT_THRESHOLD: 20.0,

    // === COULEURS (Pour remplacer java.awt.Color) ===
    COLORS: {
        SKY: '#87CEEB',      // SkyBlue
        GROUND: '#228B22',   // ForestGreen
        BRICK: '#8B4513',    // SaddleBrown
        PLAYER: '#FF0000',   // Red
        TEXT: '#FFFFFF',     // White
        OVERLAY: 'rgba(0, 0, 0, 0.7)' // Noir transparent pour le countdown
    },

    // Debug (comme ton printScaleInfo)
    printScaleInfo: () => {
        console.log("=== Configuration Scaling JS ===");
        console.log(`Écran: ${screenWidth}x${screenHeight}`);
        console.log(`Jeu Logique: ${GAME_WIDTH}x${GAME_HEIGHT}`);
        console.log(`Scale: ${SCALE.toFixed(2)}x`);
        console.log(`Canvas: ${Math.floor(GAME_WIDTH * SCALE)}x${Math.floor(GAME_HEIGHT * SCALE)}`);
    }
};
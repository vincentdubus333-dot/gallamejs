import { GameConfig } from '../GameConfig.js';
// On n'a plus besoin d'importer la classe Camera ici, car on utilise l'instance passée en paramètre

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Optimisation : Anti-aliasing
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
    }

    render(level, player, camera, gameState) {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // --- CORRECTION 1 : Utiliser les getters de l'instance camera ---
        const camX = camera.X; 
        const camY = camera.Y;

        // 1. Effacer l'écran
        ctx.clearRect(0, 0, width, height);

        // 2. Ciel (On le dessine AVANT le zoom pour qu'il remplisse tout l'écran quoi qu'il arrive)
        ctx.fillStyle = level.skyColor;
        ctx.fillRect(0, 0, width, height);

        // --- DÉBUT DU ZOOM ---
        ctx.save();
        
        // Sécurité : si SCALE est invalide, on reste à 1
        if (GameConfig.SCALE && GameConfig.SCALE > 0) {
            ctx.scale(GameConfig.SCALE, GameConfig.SCALE);
        }

        // 3. Images de fond
        level.backgroundImages.forEach(bg => {
            this.drawBackgroundImage(ctx, bg, level.groundColor, camX, camY);
        });

        // 4. Sol
        const groundScreenY = Math.round(GameConfig.GROUND_Y - camY);
        // On dessine très large (-1000 à +WorldWidth) pour être sûr de couvrir l'écran même zoomé
        if (groundScreenY < height / GameConfig.SCALE + 100) { // Petite marge de sécurité
            ctx.fillStyle = level.groundColor;
            ctx.fillRect(-100, groundScreenY, GameConfig.WORLD_WIDTH + 200, GameConfig.WORLD_WIDTH);
            
            // Bordure foncée
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(-100, groundScreenY, GameConfig.WORLD_WIDTH + 200, 6);
        }

        // 5. Nuages
        if (level.clouds) {
            level.clouds.forEach(cloud => cloud.draw(ctx, camX, camY));
        }

        // 6. Blocs
        level.blocks.forEach(block => block.draw(ctx, camX, camY));

        // 7. Entités

// Dessiner les prompts des portes actives
if (level.doors) {
    level.doors.forEach(door => {
        if (door.isActive) {
            door.drawInteractionPrompt(ctx, camera.x, camera.y);
        }
    });
}

        level.mobs.forEach(mob => {
            if (mob.isAlive) mob.draw(ctx, camX, camY);
        });

        level.npcs.forEach(npc => {
            npc.draw(ctx, camX, camY);
            if (npc.isPlayerNear(player)) {
                if (npc.showingMessage) npc.drawMessage(ctx, camX, camY);
                else npc.drawInteractionPrompt(ctx, camX, camY);
            }
        });

        // 8. Joueur
        player.draw(ctx, camX, camY);

        // --- FIN DU ZOOM ---
        ctx.restore();

        // 9. HUD & Overlays (Dessinés par dessus le zoom pour rester nets)
        this.drawHUD(ctx, level, gameState);

        if (gameState.isCountingDown) {
            this.drawCountdown(ctx, gameState.countdown);
        } else if (gameState.isGameWon) {
            this.drawWinScreen(ctx, gameState.currentTime, gameState.bestTime);
        }
    }

    drawBackgroundImage(ctx, bgImg, groundColorHex, camX, camY) {
        if (!bgImg.image) return;

        const imgX = Math.round(bgImg.worldX - camX);
        const imgY = Math.round(bgImg.worldY - camY);
        
        ctx.drawImage(bgImg.image, imgX, imgY, bgImg.width, bgImg.height);

        const groundScreenY = Math.round(GameConfig.GROUND_Y - camY);
        const gradientYStart = imgY + bgImg.height;
        
        // --- CORRECTION 2 : gradientYEnd n'existait pas ---
        // On utilise groundScreenY comme point d'arrêt du dégradé
        const gradientHeight = groundScreenY - gradientYStart;

        if (gradientHeight > 0) {
            // Création du dégradé vertical
            const grad = ctx.createLinearGradient(0, gradientYStart, 0, groundScreenY);
            
            grad.addColorStop(0, groundColorHex); 
            grad.addColorStop(1, 'rgba(0,0,0,0)'); // Transparent

            ctx.fillStyle = grad;
            ctx.fillRect(imgX, gradientYStart, bgImg.width, gradientHeight);
        }
    }

    drawHUD(ctx, level, gameState) {
        ctx.fillStyle = 'black';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top'; // Plus facile pour aligner en haut

        let helpText = "Déplacements: ← →   Saut: ↑/Espace";
        if (level.glideAllowed) helpText += "   Glide: ↓";
        
        ctx.fillText(helpText, 10, 10);
        ctx.fillText("Redémarrer: R", 10, 30);

        // Nom niveau
        ctx.textAlign = 'right';
        ctx.font = 'bold 16px sans-serif';
        // On utilise la vraie largeur du canvas pour le HUD
        ctx.fillText(level.name || "Niveau", this.canvas.width - 20, 10);

        // Chrono
        ctx.font = '16px sans-serif';
        const timeStr = `Temps: ${gameState.currentTime.toFixed(1)}`;
        ctx.fillText(timeStr, this.canvas.width - 20, 30);
    }

    drawCountdown(ctx, count) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.fillStyle = 'white';
        ctx.font = 'bold 120px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const text = count > 0 ? count : "GO!";
        ctx.fillText(text, this.canvas.width / 2, this.canvas.height / 2);
    }

    drawWinScreen(ctx, currentTime, bestTime) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.font = 'bold 70px Arial';
        ctx.fillText("Gagné !", centerX, centerY - 60);

        ctx.font = '24px Arial';
        ctx.fillText(`Votre temps: ${currentTime.toFixed(1)} s`, centerX, centerY + 20);

        ctx.font = 'bold 24px Arial';
        const bestText = bestTime === Infinity ? "---" : bestTime.toFixed(1);
        ctx.fillText(`Meilleur temps: ${bestText} s`, centerX, centerY + 60);

        ctx.fillStyle = '#ccc';
        ctx.font = '18px Arial';
        ctx.fillText("Appuyez sur ENTRÉE pour continuer", centerX, centerY + 120);
    }
}
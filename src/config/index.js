import Phaser from "phaser";

export default {
  type: Phaser.AUTO,
  width: 360,
  height: 640,
  pixelArt: false,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 1000 }
    }
  }
};

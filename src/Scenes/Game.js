import Phaser from "phaser";

export default class GameScene extends Phaser.Scene {
  constructor(key) {
    super(key);
    this.playerSpeed = 150;
    this.jumpSpeed = -500;
  }
  preload() {
    const playerConfig = {
      frameWidth: 28,
      frameHeight: 30,
      margin: 1,
      spacing: 1
    };
    const fireConfig = {
      frameWidth: 20,
      frameHeight: 21,
      margin: 1,
      spacing: 1
    };
    this.load.spritesheet("player", "assets/images/player_spritesheet.png", playerConfig);
    this.load.spritesheet("fire", "assets/images/fire_spritesheet.png", fireConfig);
    this.load.image("ground", "assets/images/ground.png");
    this.load.image("platform", "assets/images/platform.png");
    this.load.image("block", "assets/images/block.png");
    this.load.image("goal", "assets/images/gorilla3.png");
    this.load.image("barrel", "assets/images/barrel.png");
    this.load.json("levelData", "assets/json/levelData.json"); // cache level data
  }
  create() {
    this.setupAnims();
    this.setupLevel();
    this.setupSpawner();

    this.physics.add.collider([this.player, this.goal, this.barrels], this.platforms); // collision detection
    this.physics.add.overlap(this.player, [this.fires, this.goal, this.barrels], this.restartGame, null, this);
    this.cursors = this.input.keyboard.createCursorKeys(); // enable keyboard cursors
  }
  update() {
    const onGround = this.player.body.blocked.down || this.player.body.touching.down;

    // handle moving
    if (this.cursors.left.isDown) {
      this.player.body.setVelocityX(-this.playerSpeed); // move left
      this.player.flipX = false; // face to left
      if (onGround && !this.player.anims.isPlaying) this.player.anims.play("walking");
    } else if (this.cursors.right.isDown) {
      this.player.body.setVelocityX(this.playerSpeed); // move right
      this.player.flipX = true; // face to right
      if (onGround && !this.player.anims.isPlaying) this.player.anims.play("walking");
    } else {
      this.player.body.setVelocityX(0);
      this.player.anims.stop("walking");
      if (onGround) this.player.setFrame(3);
    }

    // handle jumping
    if (onGround && this.cursors.space.isDown) {
      this.player.body.setVelocityY(this.jumpSpeed);
      this.player.anims.stop("walking");
      this.player.setFrame(2);
    }
  }
  setupAnims() {
    // player animation
    const walkingConf = {
      key: "walking",
      frames: this.anims.generateFrameNames("player", {
        frames: [0, 1, 2]
      }),
      frameRate: 12,
      yoyo: true,
      repeat: -1
    };

    // fire animation
    const burningConf = {
      key: "burning",
      frames: this.anims.generateFrameNames("fire", {
        frames: [0, 1]
      }),
      frameRate: 4,
      repeat: -1
    };
    if (!this.anims.get("walking")) this.anims.create(walkingConf);
    if (!this.anims.get("burning")) this.anims.create(burningConf);
  }
  setupLevel() {
    this.levelData = this.cache.json.get("levelData");

    // create platform
    this.platforms = this.physics.add.staticGroup();
    this.levelData.platforms.forEach(item => {
      let newObj;
      if (item.numtiles === 1) {
        newObj = this.add.sprite(item.x, item.y, item.key).setOrigin(0);
      } else {
        const w = this.textures.get(item.key).get(0).width;
        const h = this.textures.get(item.key).get(0).height;
        newObj = this.add.tileSprite(item.x, item.y, item.numTiles * w, h, item.key).setOrigin(0);
      }
      this.physics.add.existing(newObj, true);
      this.platforms.add(newObj);
    });

    // create all fires
    this.fires = this.physics.add.group({ allowGravity: false, immovable: true });
    this.levelData.fires.forEach(item => {
      const newObj = this.add.sprite(item.x, item.y, "fire").setOrigin(0);
      newObj.anims.play("burning");
      this.fires.add(newObj);
    });

    // create player
    this.player = this.add.sprite(this.levelData.player.x, this.levelData.player.y, "player", 3);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true); // prevent player move out of screen

    // create goal
    this.goal = this.add.sprite(this.levelData.goal.x, this.levelData.goal.y, "goal");
    this.physics.add.existing(this.goal);

    // set world bound
    this.physics.world.bounds.width = this.levelData.world.width;
    this.physics.world.bounds.height = this.levelData.world.height;

    // set cameras
    this.cameras.main.setBounds(0, 0, this.levelData.world.width, this.levelData.world.height);
    this.cameras.main.startFollow(this.player);
  }
  restartGame() {
    const cb = () => this.scene.restart();
    this.cameras.main.fade(500);
    this.cameras.main.on("camerafadeoutcomplete", cb, this);
  }
  setupSpawner() {
    this.barrels = this.physics.add.group({ bounceY: 0.1, bounceX: 1, collideWorldBounds: true });

    const delay = this.levelData.spawner.interval;
    const loop = true;
    const callbackScope = this;
    const callback = () => {
      const barrel = this.barrels.get(this.goal.x, this.goal.y, "barrel"); // create barrel
      const delay = this.levelData.spawner.lifespan;
      const repeat = 0;
      const callbackScope = this;
      const callback = () => {
        this.barrels.killandHide(barrel);
        barrel.body.enable = false;
      };

      // reactivate
      barrel.setActive(true);
      barrel.setVisible(true);
      barrel.body.enable = true;

      barrel.setVelocityX(this.levelData.spawner.speed);
      this.time.addEvent({ delay, repeat, callbackScope, callback });
    };

    let spawningEvent = this.time.addEvent({ delay, loop, callbackScope, callback });
  }
}

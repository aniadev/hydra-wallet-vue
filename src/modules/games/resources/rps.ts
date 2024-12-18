export namespace RpsGame {
  export class GameRenderer {
    private context: CanvasRenderingContext2D
    constructor(
      private game: Game,
      private canvas: HTMLCanvasElement,
      private gameSize: { width: number; height: number } = { width: 600, height: 400 }
    ) {
      console.log('GameRenderer created')
      this.canvas.width = this.gameSize.width
      this.canvas.height = this.gameSize.height
      this.context = this.canvas.getContext('2d') as CanvasRenderingContext2D
      // TODO: Setup context renderer
    }
  }

  export interface GameContructorOption {
    canvas?: HTMLCanvasElement
    gameWidth?: number
    gameHeight?: number
  }

  export class Game {
    player1: Player
    player2: Player
    winner: Player | null = null
    time: Date = new Date()
    history: Round[] = []
    currentRound: Round | null = null
    onRoundFinished: (round: Round) => void = () => {}

    // renderer: GameRenderer
    renderer: null | GameRenderer = null

    constructor(player1: Player, player2: Player, options?: GameContructorOption) {
      console.log('Game created')
      this.player1 = player1
      this.player2 = player2
      if (options?.canvas) {
        this.renderer = new GameRenderer(this, options.canvas)
      }

      this.currentRound = new Round(this, null, null)

      this.player1.onMove = move => {
        if (this.currentRound) {
          this.currentRound.setPlayerMove(this.player1, move)
        }
      }

      this.player2.onMove = move => {
        if (this.currentRound) {
          this.currentRound.setPlayerMove(this.player2, move)
        }
      }
    }

    startRound() {
      if (!this.currentRound) {
        this.currentRound = new Round(this, null, null)
      }
      this.currentRound.start()
    }

    update() {
      //
    }

    reset() {
      console.log('Game reset')
      this.currentRound = null
      this.winner = null
      this.history = []
    }
  }

  export enum GameMove {
    ROCK = 'rock',
    PAPER = 'paper',
    SCISSORS = 'scissors'
  }

  export class Round {
    id: string = Math.random().toString(36).substring(7)
    game: Game
    state: 'idle' | 'playing' | 'finished' = 'idle'
    timer: null | NodeJS.Timeout = null
    currentRoundTiming: number = 0
    maxRoundTiming: number = 10
    player1Move: GameMove | null = null
    player2Move: GameMove | null = null

    constructor(
      game: Game,
      player1Move: GameMove | null,
      player2Move: GameMove | null,
      options?: { maxRoundTiming: number }
    ) {
      console.log('Round created')
      this.game = game
      this.maxRoundTiming = options?.maxRoundTiming || this.maxRoundTiming
    }

    start() {
      console.log('Round started')
      this.state = 'playing'
      this.currentRoundTiming = this.maxRoundTiming
      this.player1Move = null
      this.player2Move = null
      this.timer = setInterval(() => {
        this.currentRoundTiming -= 1
        if (this.currentRoundTiming <= 0) {
          this.state = 'finished'
          this.game.onRoundFinished(this)
          if (this.timer) clearInterval(this.timer)
        }
        this.update()
      }, 1000)
    }

    update() {
      console.log('Round updated', this.currentRoundTiming)
    }

    setPlayerMove(player: Player, move: GameMove) {
      if (player === this.game.player1) {
        if (this.player1Move) {
          console.warn('Player 1 already moved')
          return
        }
        this.player1Move = move
      }
      if (player === this.game.player2) {
        if (this.player2Move) {
          console.warn('Player 2 already moved')
          return
        }
        this.player2Move = move
      }
      if (this.player1Move && this.player2Move) {
        this.state = 'finished'
        console.log(this)
        this.game.onRoundFinished(this)
        if (this.timer) clearInterval(this.timer)
      }
    }

    get winner() {
      if (this.player1Move && this.player2Move) {
        if (this.player1Move === this.player2Move) {
          return null
        }
        if (
          (this.player1Move === GameMove.ROCK && this.player2Move === GameMove.SCISSORS) ||
          (this.player1Move === GameMove.PAPER && this.player2Move === GameMove.ROCK) ||
          (this.player1Move === GameMove.SCISSORS && this.player2Move === GameMove.PAPER)
        ) {
          return this.game.player1
        }
        return this.game.player2
      }
      return null
    }

    get winnerMessage() {
      if (this.state !== 'finished') {
        return 'Game is not finished yet!'
      }
      if (this.winner) {
        return `${this.winner.name} wins!`
      }
      return 'Draw!'
    }
  }

  export class Player {
    name: string
    metadata: Record<string, any> = {}
    onMove: (move: GameMove) => void = () => {}

    constructor(name: string) {
      console.log('Player created', name)
      this.name = name
    }

    move(move: GameMove) {
      this.onMove(move)
    }
  }
}

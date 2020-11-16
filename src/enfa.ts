import * as rerejs from 'rerejs';
import {
  EpsilonNFA,
  State,
  Char,
  NullableTransition,
} from './types';

export function buildEpsilonNFA(pattern: rerejs.Pattern): EpsilonNFA {
  return new Builder(pattern).build();
}

class Builder {
  private stateList: State[] = [];
  private transitions: Map<State, NullableTransition[]> = new Map();
  private stateId = 0;

  constructor(
    private pattern: rerejs.Pattern,
  ) {}

  build(): EpsilonNFA {
    this.stateList = [];
    this.transitions = new Map();
    this.stateId = 0;
    const { initialState, acceptingState } = this.buildChild(this.pattern.child);
    return {
      type: 'EpsilonNFA',
      stateList: this.stateList,
      initialState,
      acceptingState,
      transitions: this.transitions,
    };
  }

  private buildChild(node: rerejs.Node): Pick<EpsilonNFA, 'initialState' | 'acceptingState'> {
    switch (node.type) {
      case 'Disjunction': {
        const q0 = this.createState();
        const childNFAs = node.children.map((child) => this.buildChild(child));
        const f0 = this.createState();
        for (const childNFA of childNFAs) {
          const q1 = childNFA.initialState;
          const f1 = childNFA.acceptingState;
          this.addTransition(q0, null, q1);
          this.addTransition(f1, null, f0);
        }
        return {
          initialState: q0,
          acceptingState: f0,
        };
      }
      case 'Sequence': {
        if (node.children.length === 0) {
          const q0 = this.createState();
          const f0 = this.createState();
          this.addTransition(q0, null, f0);
          return {
            initialState: q0,
            acceptingState: f0,
          };
        } else {
          const childNFAs = node.children.map((child) => this.buildChild(child));
          for (let i = 0; i < childNFAs.length - 1; i++) {
            const f1 = childNFAs[i].acceptingState;
            const q2 = childNFAs[i + 1].initialState;
            this.addTransition(f1, null, q2);
          }
          const q0 = childNFAs[0].initialState;
          const f0 = childNFAs[childNFAs.length - 1].acceptingState;
          return {
            initialState: q0,
            acceptingState: f0,
          };
        }
      }
      case 'Capture':
      case 'NamedCapture':
      case 'Group': {
        return this.buildChild(node.child);
      }
      case 'Many': {
        const q0 = this.createState();
        const childNFA = this.buildChild(node.child);
        const f0 = this.createState();
        const q1 = childNFA.initialState;
        const f1 = childNFA.acceptingState;
        if (node.nonGreedy) {
          this.addTransition(q0, null, f0);
          this.addTransition(q0, null, q1);
          this.addTransition(f1, null, f0);
          this.addTransition(f1, null, q1);
        } else {
          this.addTransition(q0, null, q1);
          this.addTransition(q0, null, f0);
          this.addTransition(f1, null, q1);
          this.addTransition(f1, null, f0);
        }
        return {
          initialState: q0,
          acceptingState: f0,
        };
      }
      case 'Some':
      case 'Optional':
      case 'Repeat':
      case 'WordBoundary':
      case 'LineBegin':
      case 'LineEnd':
      case 'LookAhead':
      case 'LookBehind': {
        throw new Error('unimplemented');
      }
      case 'Char':
      case 'EscapeClass':
      case 'Class':
      case 'Dot': {
        const q0 = this.createState();
        const f0 = this.createState();
        this.addTransition(q0, node, f0);
        return {
          initialState: q0,
          acceptingState: f0,
        };
      }
      case 'BackRef':
      case 'NamedBackRef': {
        throw new Error('unimplemented');
      }
    }
  }

  private createState(): State {
    const state = {
      id: `q${this.stateId++}`,
    };
    this.stateList.push(state);
    this.transitions.set(state, []);
    return state;
  }

  private addTransition(source: State, char: Char | null, destination: State): void {
    this.transitions.get(source)!.push({ char, destination });
  }
}

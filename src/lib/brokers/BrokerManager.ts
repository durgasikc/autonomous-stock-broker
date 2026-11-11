import type { IBrokerAdapter } from './IBrokerAdapter';
import { SimulatedBroker } from './SimulatedBroker';
import { InteractiveBrokersAdapter } from './InteractiveBrokersAdapter';
import type { BrokerSettings, BrokerType } from '../../types';

export class BrokerManager {
  private static instance: BrokerManager;
  private simulatedBroker: SimulatedBroker;
  private ibkrAdapter: InteractiveBrokersAdapter;
  private activeType: BrokerType = 'PAPER';

  private settings: BrokerSettings = {
    activeBroker: 'PAPER',
    ibkr: {
      baseUrl: 'https://localhost:5000/v1/api',
      accountId: 'DU123456',
      sslVerify: false,
      paperAccount: true,
    },
    alpaca: {
      apiKey: '',
      secretKey: '',
      paperTrading: true,
    },
    paper: {
      slippagePct: 0.05,
      commissionPerShare: 0.005,
    },
  };

  private constructor() {
    this.simulatedBroker = new SimulatedBroker();
    this.ibkrAdapter = new InteractiveBrokersAdapter(this.settings.ibkr);
  }

  public static getInstance(): BrokerManager {
    if (!BrokerManager.instance) {
      BrokerManager.instance = new BrokerManager();
    }
    return BrokerManager.instance;
  }

  public getBroker(type?: BrokerType): IBrokerAdapter {
    const targetType = type || this.activeType;
    if (targetType === 'INTERACTIVE_BROKERS') {
      return this.ibkrAdapter;
    }
    return this.simulatedBroker;
  }

  public getSimulatedBroker(): SimulatedBroker {
    return this.simulatedBroker;
  }

  public getSettings(): BrokerSettings {
    return this.settings;
  }

  public updateSettings(newSettings: Partial<BrokerSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    if (newSettings.activeBroker) {
      this.activeType = newSettings.activeBroker;
    }
    if (newSettings.ibkr) {
      this.ibkrAdapter = new InteractiveBrokersAdapter(this.settings.ibkr);
    }
  }

  public setActiveBroker(type: BrokerType) {
    this.activeType = type;
    this.settings.activeBroker = type;
  }

  public getActiveBrokerType(): BrokerType {
    return this.activeType;
  }
}

const mockConsumer = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  subscribe: jest.fn(),
  run: jest.fn(),
};

const mockProducer = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  send: jest.fn(),
};

jest.mock('kafkajs', () => ({
  Kafka: jest.fn().mockImplementation(() => ({
    producer: () => mockProducer,
    consumer: () => mockConsumer,
  })),
}));

const { KafkaService } = require('../../services/kafka');

describe('KafkaService subscriptions', () => {
  let kafkaService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConsumer.connect.mockResolvedValue(undefined);
    mockConsumer.subscribe.mockResolvedValue(undefined);
    mockConsumer.run.mockResolvedValue(undefined);
    mockProducer.connect.mockResolvedValue(undefined);
    kafkaService = new KafkaService('test-service', 'test-group');
  });

  it('subscribes to every topic before starting the consumer once', async () => {
    const transactionHandler = jest.fn();
    const fraudHandler = jest.fn();

    await kafkaService.connect();
    await kafkaService.subscribeToTopics([
      { topic: 'transactions', callback: transactionHandler },
      { topic: 'fraud-alert', callback: fraudHandler },
    ]);

    expect(mockConsumer.subscribe).toHaveBeenNthCalledWith(1, {
      topic: 'transactions',
      fromBeginning: false,
    });
    expect(mockConsumer.subscribe).toHaveBeenNthCalledWith(2, {
      topic: 'fraud-alert',
      fromBeginning: false,
    });
    expect(mockConsumer.run).toHaveBeenCalledTimes(1);

    const { eachMessage } = mockConsumer.run.mock.calls[0][0];
    await eachMessage({
      topic: 'fraud-alert',
      message: { value: Buffer.from(JSON.stringify({ messageId: 'message-1' })) },
    });

    expect(fraudHandler).toHaveBeenCalledWith({ messageId: 'message-1' });
    expect(transactionHandler).not.toHaveBeenCalled();
  });

  it('keeps the single-topic subscription API', async () => {
    const handler = jest.fn();

    await kafkaService.connect();
    await kafkaService.subscribeToTopic('transactions', handler);

    expect(mockConsumer.subscribe).toHaveBeenCalledTimes(1);
    expect(mockConsumer.run).toHaveBeenCalledTimes(1);
  });
});
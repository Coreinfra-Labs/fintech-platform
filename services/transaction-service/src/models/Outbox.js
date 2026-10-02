const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize) => {
  return sequelize.define(
    'Outbox',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: () => uuidv4(),
        primaryKey: true,
      },
      aggregateId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      aggregateType: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      eventType: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      payload: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      kafkaTopic: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      published: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      publishedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      schema: 'transactions',
      tableName: 'outbox',
      timestamps: false,
    }
  );
};

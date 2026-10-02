const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize) => {
  return sequelize.define(
    'Inbox',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: () => uuidv4(),
        primaryKey: true,
      },
      messageId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      message: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      consumerGroup: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      processed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      processedAt: {
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
      tableName: 'inbox',
      timestamps: false,
    }
  );
};

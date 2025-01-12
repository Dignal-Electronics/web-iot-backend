'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class devices_data extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  };
  devices_data.init({
    device_id: DataTypes.INTEGER,
    topic: DataTypes.STRING,
    data: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'DeviceData',
    tableName: 'devices_data',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  return devices_data;
};
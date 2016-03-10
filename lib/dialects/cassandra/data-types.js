'use strict';

var wkx = require('wkx')
  , _ = require('lodash')
  , moment = require('moment-timezone');

module.exports = function (BaseTypes) {
  BaseTypes.ABSTRACT.prototype.dialectTypes = 'https://docs.datastax.com/en/cql/3.1/cql/cql_reference/cql_data_types_c.html';

  BaseTypes.DATE.types.cassandra = ['timestamp'];
  BaseTypes.STRING.types.cassandra = ['VAR_STRING'];
  BaseTypes.CHAR.types.cassandra = ['STRING'];
  BaseTypes.TEXT.types.cassandra = ['BLOB'];
  BaseTypes.INTEGER.types.cassandra = ['LONG'];
  BaseTypes.BIGINT.types.cassandra = ['LONGLONG'];
  BaseTypes.FLOAT.types.cassandra = ['FLOAT'];
  BaseTypes.TIME.types.cassandra = ['TIME'];
  BaseTypes.DATEONLY.types.cassandra = ['DATE'];
  BaseTypes.BOOLEAN.types.cassandra = ['TINY'];
  BaseTypes.BLOB.types.cassandra = ['TINYBLOB', 'BLOB', 'LONGBLOB'];
  BaseTypes.DECIMAL.types.cassandra = ['NEWDECIMAL'];
  BaseTypes.UUID.types.cassandra = false;
  BaseTypes.ENUM.types.cassandra = false;
  BaseTypes.REAL.types.cassandra = ['DOUBLE'];
  BaseTypes.DOUBLE.types.cassandra = ['DOUBLE'];

  var DATE = BaseTypes.DATE.inherits();

  DATE.prototype.toSql = function () {
    return 'DATETIME' + (this._length ? '(' + this._length + ')' : '');
  };

  DATE.prototype.$stringify = function (date, options) {
    // Fractional DATETIMEs only supported on MySQL 5.6.4+
    if (this._length) {
      return BaseTypes.DATE.prototype.$stringify(date, options);
    }

    date = BaseTypes.DATE.prototype.$applyTimezone(date, options);
    return date.format('YYYY-MM-DD HH:mm:ss');
  };

  DATE.parse = function (value, options) {
    value = value.string();

    if (value === null) {
      return value;
    }

    if (moment.tz.zone(options.timezone)) {
      value = moment.tz(value, options.timezone).toDate();
    } else {
      value = new Date(value + ' ' + options.timezone);
    }

    return value;
  };

  var UUID = BaseTypes.UUID.inherits();

  UUID.prototype.toSql = function() {
    return 'CHAR(36) BINARY';
  };

  var SUPPORTED_GEOMETRY_TYPES = ['POINT', 'LINESTRING', 'POLYGON'];
  var GEOMETRY = BaseTypes.GEOMETRY.inherits(function() {
    if (!(this instanceof GEOMETRY)) return new GEOMETRY();
    BaseTypes.GEOMETRY.apply(this, arguments);

    if (_.isEmpty(this.type)) {
      this.sqlType = this.key;
    } else if (_.includes(SUPPORTED_GEOMETRY_TYPES, this.type)) {
      this.sqlType = this.type;
    } else {
      throw new Error('Supported geometry types are: ' + SUPPORTED_GEOMETRY_TYPES.join(', '));
    }
  });

  GEOMETRY.parse = GEOMETRY.prototype.parse = function(value) {
    value = value.buffer();

    //MySQL doesn't support POINT EMPTY, https://dev.cassandra.com/worklog/task/?id=2381
    if (value === null) {
      return null;
    }

    // For some reason, discard the first 4 bytes
    value = value.slice(4);

    return wkx.Geometry.parse(value).toGeoJSON();
  };

  GEOMETRY.prototype.toSql = function() {
    return this.sqlType;
  };

  var ENUM = BaseTypes.ENUM.inherits();

  ENUM.prototype.toSql = function (options) {
    return 'ENUM(' + _.map(this.values, function(value) {
      return options.escape(value);
    }).join(', ') + ')';
  };

  BaseTypes.GEOMETRY.types.cassandra = ['GEOMETRY'];

  var exports = {
    ENUM: ENUM,
    DATE: DATE,
    UUID: UUID,
    GEOMETRY: GEOMETRY
  };

  _.forIn(exports, function (DataType, key) {
    if (!DataType.key) DataType.key = key;
    if (!DataType.extend) {
      DataType.extend = function(oldType) {
        return new DataType(oldType.options);
      };
    }
  });

  return exports;
};

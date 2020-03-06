///<reference path="../../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
import _ from 'lodash';
import IDatasourceAttrs from '../Interfaces/IDatasourceAttrs';
import IGrafanaAttrs from '../Interfaces/IGrafanaAttrs';
import ITarget from '../Interfaces/ITarget';
import HumioQuery from './humio_query';
import HumioHelper from './humio_helper';
import { WidgetType } from '../Types/WidgetType';

class Panel {
  queries: Map<number, HumioQuery>;

  constructor() {
    this.queries = new Map<number, HumioQuery>();
  }

  async update(datasourceAttrs: IDatasourceAttrs, grafanaAttrs: IGrafanaAttrs, targets: ITarget[]):
   Promise<{data: Array<{target: string, datapoints: Array<[number, number]>}>}> {
    let allQueryPromise = targets.map((target: ITarget, index: number) => {
      let query = this.queries.get(index);
      if (!query) {
        query = new HumioQuery(target.humioQuery);
        this.queries.set(index, query);
      }
      return query.composeQuery(datasourceAttrs, grafanaAttrs, target);
    });

    const queryResponses = await Promise.all(allQueryPromise);

    const result = _.flatMap(queryResponses, (res, index) => {
      const data = res.data;
      if (res.data.events.length === 0) {
        return [];
      }

      const valueField = getValueFieldName(data);
      let widgetType = HumioHelper.widgetType(data, targets[index]);

      switch (widgetType) {
        case WidgetType.timechart: {
          let seriesField = data.metaData.extraData.series;
          if(!seriesField){
            seriesField = "placeholder";
            data.events = data.events.map(event => {event[seriesField] = valueField; return event});
          }
          return this._composeTimechart(data.events, seriesField, valueField);
        }
        case WidgetType.table:
          return this._composeTable(data.events, data.metaData.fieldOrder);
        default: {
          return this._composeUntyped(data, valueField);
        }
      }
    });
    return {data: result};
  }

  private _composeTimechart(events: any, seriesField: string, valueField: string): {target: string; datapoints: number[][]}[] {
    let series: Object = {};
    // multiple series
    for (let i = 0; i < events.length; i++) {
      let event = events[i];
      let point = [parseFloat(event[valueField]), parseInt(event._bucket)];
      if (!series[event[seriesField]]) {
        series[event[seriesField]] = [point];
      } else {
        series[event[seriesField]].push(point);
      }
    }
    return _.keys(series).map(s => {
      return {
        target: s,
        datapoints: series[s],
      };
    });
  }

  private _composeTable(rows: Array<object>, columns: Array<string>) {
    return [{
      columns: columns.map(column => { return { text: column } }),
      rows: rows.map(row => columns.map(column => row[column])),
      type: 'table'
    }];
  }

  private _composeUntyped(data, valueField) {
    return _.flatMap(data.events, (event) => {
      const groupbyFields = data.metaData.extraData.groupby_fields;

      if(groupbyFields) {
        const groupName = groupbyFields.split(',').map(field => '[' + event[field.trim()] + ']').join(' ');
        if (_.keys(event).length > 1) {
          return {
            target: groupName,
            datapoints: [[parseFloat(event[valueField])]],
          };
        }
      } else {
        return {
          target: valueField[0],
          datapoints: [[parseFloat(event[valueField[0]]), event[valueField[1]]]],
        }
      }
    });
  }
}

export const getValueFieldName = (responseData) => {
  const timeseriesField = '_bucket';
  const seriesField = responseData.metaData.extraData.series;
  const groupByFields = responseData.metaData.extraData.groupby_fields;
  let groupByFieldsSplit = [];
  if(groupByFields)
  {
    groupByFieldsSplit = groupByFields.split(',').map(field => field.trim());
  }
  const valueFieldsToExclude = _.flatten([timeseriesField, seriesField, groupByFieldsSplit]);
  const defaultValueFieldName = '_count';

  if (responseData.metaData.fieldOrder) {
    const valueFieldNames = _.filter(
      responseData.metaData.fieldOrder,
      fieldName => !_.includes(valueFieldsToExclude, fieldName) // TODO: Figure out what this does?
    ); 
    
    return valueFieldNames[0] || defaultValueFieldName;
  }

  if (responseData.events.length > 0) {
    const valueFieldNames = responseData.events.reduce((allFieldNames, event) => {
      const valueFields = _.difference(Object.keys(event), valueFieldsToExclude);
      
      return [...valueFields, ...allFieldNames];
    }, []);

    return valueFieldNames || defaultValueFieldName;
  }

  return defaultValueFieldName;
}

export default Panel;

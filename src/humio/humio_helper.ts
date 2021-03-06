import { WidgetType } from '../Types/WidgetType';

class HumioHelper {
  static dateIsNow(toDateCheck: any) {
    if (typeof toDateCheck === 'string') {
      return toDateCheck.match(/^(now[^-]|now$)/) != null;
    } else {
      return false;
    }
  }

  static queryIsLive(location: Location, date: any) {
    return HumioHelper.automaticPanelRefreshHasBeenActivated(location) && HumioHelper.dateIsNow(date);
  }

  static automaticPanelRefreshHasBeenActivated(location: Location) {
    return (location ? location.search.includes('refresh=') || null : null) != null;
  }

  static widgetType(data: any, target: any) {
    if (data.metaData.extraData.timechart === 'true') {
      return WidgetType.timechart;
    }
    if (this.isTableQuery(target)) {
      return WidgetType.table;
    }
    if (data.metaData.extraData['ui:suggested-widget'] === 'world-map') {
      return WidgetType.worldmap;
    } else {
      return WidgetType.untyped;
    }
  }

  static isTableQuery(target: any): boolean {
    return typeof target.humioQuery === 'string'
      ? new RegExp(/(table\()(.+)(\))/).exec(target.humioQuery) !== null
      : false;
  }

  static parseDateFrom(date: string) {
    switch (date) {
      case 'now-2d': {
        return '2d';
      }
      case 'now-7d': {
        return '7d';
      }
      case 'now-30d': {
        return '30d';
      }
      case 'now-90d': {
        return '90d';
      }
      case 'now-6M': {
        return '180d';
      }
      case 'now-1y': {
        return '1y';
      }
      case 'now-2y': {
        return '2y';
      }
      case 'now-5y': {
        return '5y';
      }
      case 'now-1d/d': {
        return '1d';
      }
      case 'now-2d/d': {
        return '2d';
      }
      case 'now-7d/d': {
        return '7d';
      }
      case 'now-1w/w': {
        return '7d';
      }
      case 'now-1M/M': {
        return '1m';
      }
      case 'now-1y/y': {
        return '1y';
      }
      case 'now/d': {
        return '1d';
      }
      case 'now/w': {
        return '7d';
      }
      case 'now/M': {
        return '1m';
      }
      case 'now/y': {
        return '1y';
      }
      case 'now-5m': {
        return '5m';
      }
      case 'now-15m': {
        return '15m';
      }
      case 'now-30m': {
        return '30m';
      }
      case 'now-1h': {
        return '1h';
      }
      case 'now-3h': {
        return '3h';
      }
      case 'now-6h': {
        return '6h';
      }
      case 'now-12h': {
        return '12h';
      }
      case 'now-24h': {
        return '24h';
      }
      default: {
        return '24h';
      }
    }
  }
}

export default HumioHelper;

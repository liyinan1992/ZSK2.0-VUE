/**
 * 生产环境
 */
;(function () {
  window.SITE_CONFIG = {};

  // api接口请求地址
  window.SITE_CONFIG['baseUrl'] = 'http://demo.renren.io/renren-fast';

  // cdn地址 = 域名 + 版本号
  window.SITE_CONFIG['domain']  = './'; // 域名
  window.SITE_CONFIG['version'] = '';   // 版本号(年月日时分)
  window.SITE_CONFIG['cdnUrl']  = window.SITE_CONFIG.domain + window.SITE_CONFIG.version;

  // oss存放文件ftp地址
  window.SITE_CONFIG['ossftpurl']  = 'http://localhost:80/oaattach/';

  // 提示等待时间
  window.SITE_CONFIG['wait']  = 500;
})();

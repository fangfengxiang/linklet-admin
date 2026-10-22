export default [
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/dashboard',
    name: '仪表盘',
    icon: 'DashboardOutlined',
    component: './Dashboard',
  },
  {
    path: '/short-link',
    name: '短链管理',
    icon: 'LinkOutlined',
    component: './ShortLink',
  },
  {
    path: '/domain-entry',
    name: '域名资源',
    icon: 'GlobalOutlined',
    component: './DomainEntry',
  },
  {
    path: '/group',
    name: '分组管理',
    icon: 'AppstoreOutlined',
    component: './Group',
  },
  {
    path: '/group-config',
    name: '分组配置',
    icon: 'SettingOutlined',
    component: './GroupConfig',
  },
  {
    path: '/tenant',
    name: '租户管理',
    icon: 'TeamOutlined',
    component: './Tenant',
  },
  {
    path: '/credential',
    name: '凭证管理',
    icon: 'KeyOutlined',
    component: './Credential',
  },
  {
    path: '*',
    layout: false,
    component: './404',
  },
];

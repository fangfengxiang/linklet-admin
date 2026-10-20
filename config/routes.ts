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
    path: '/scene',
    name: '场景管理',
    icon: 'AppstoreOutlined',
    component: './Scene',
  },
  {
    path: '/scene-config',
    name: '场景配置',
    icon: 'SettingOutlined',
    component: './SceneConfig',
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

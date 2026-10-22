// 仪表盘 —— 资源概览（接入实时计数）
import { Card, Col, Row, Statistic, message } from 'antd';
import { useEffect, useState } from 'react';
import { group, shortLink, domainEntry, tenant } from '@/services';
import { DomainError } from '@/services/typings';

interface Counts {
  shortLink: number;
  group: number;
  domain: number;
  tenant: number;
}

export default function Dashboard() {
  const [counts, setCounts] = useState<Counts>({
    shortLink: 0,
    group: 0,
    domain: 0,
    tenant: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [links, groups, domains, tenants] = await Promise.all([
          shortLink.list(),
          group.list(),
          domainEntry.list(),
          tenant.list(),
        ]);
        setCounts({
          shortLink: links.length,
          group: groups.length,
          domain: domains.length,
          tenant: tenants.length,
        });
      } catch (e) {
        message.error((e as DomainError).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <Row gutter={16}>
      <Col span={6}>
        <Card>
          <Statistic title="短链总数" value={counts.shortLink} loading={loading} />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic title="分组数" value={counts.group} loading={loading} />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic title="域名数" value={counts.domain} loading={loading} />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic title="租户数" value={counts.tenant} loading={loading} />
        </Card>
      </Col>
    </Row>
  );
}

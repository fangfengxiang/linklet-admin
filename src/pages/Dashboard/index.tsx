// Each card reports this bounded query, not a full database count.
import { Alert, Card, Col, Row, Statistic } from 'antd';
import { useEffect, useState } from 'react';
import { group, shortLink, domainEntry, tenant } from '@/services';

interface Counts {
  shortLink: number | null;
  group: number | null;
  domain: number | null;
  tenant: number | null;
}
const EMPTY_COUNTS: Counts = { shortLink: null, group: null, domain: null, tenant: null };
const METRICS = [
  ['shortLink', '短链记录数'], ['group', '分组数'], ['domain', '域名数'], ['tenant', '租户数'],
] as const;

export default function Dashboard() {
  const [counts, setCounts] = useState<Counts>(EMPTY_COUNTS);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      const results = await Promise.allSettled([
        shortLink.list(), group.list(), domainEntry.list(), tenant.list(),
      ]);
      if (!active) return;
      const next = { ...EMPTY_COUNTS };
      const failures: string[] = [];
      results.forEach((result, index) => {
        const [key, title] = METRICS[index];
        if (result.status === 'fulfilled') next[key] = result.value.length;
        else failures.push(`${title}加载失败：${result.reason instanceof Error ? result.reason.message : '请求失败'}`);
      });
      setCounts(next);
      setErrors(failures);
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, []);

  return (
    <>
      <Alert type="info" showIcon style={{ marginBottom: 16 }}
        message="以下为本次返回记录数，每类最多100条，并非全库总数；短链仅统计当前业务凭证授权的分组。" />
      {errors.length > 0 && <Alert type="error" showIcon message={errors.join('；')} style={{ marginBottom: 16 }} />}
      <Row gutter={16}>
        {METRICS.map(([key, title]) => (
          <Col span={6} key={key}>
            <Card><Statistic title={title} value={counts[key] ?? '—'} loading={loading} /></Card>
          </Col>
        ))}
      </Row>
    </>
  );
}

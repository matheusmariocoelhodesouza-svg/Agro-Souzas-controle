CREATE OR REPLACE VIEW public.v2_report_monthly_financial
WITH (security_invoker = true) AS
SELECT company_id,
(date_trunc('month',coalesce(competence_date,issue_date)::timestamptz))::date AS reference_month,
sum(CASE WHEN entry_type='income' THEN amount ELSE 0::numeric END) AS income,
sum(CASE WHEN entry_type='expense' THEN amount ELSE 0::numeric END) AS expense,
sum(CASE WHEN entry_type='income' THEN amount ELSE -amount END) AS balance,
count(*) AS entries
FROM public.v2_financial_entries
WHERE status <> 'cancelled'
GROUP BY company_id,(date_trunc('month',coalesce(competence_date,issue_date)::timestamptz))::date;

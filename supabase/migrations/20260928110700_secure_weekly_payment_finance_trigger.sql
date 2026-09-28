-- Trigger interno: nao deve ficar exposto como RPC.
revoke execute on function public.v2_sync_weekly_employee_payment_finance() from public;
revoke execute on function public.v2_sync_weekly_employee_payment_finance() from anon;
revoke execute on function public.v2_sync_weekly_employee_payment_finance() from authenticated;

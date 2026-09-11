-- Comando 360 defensive data constraints
alter table public.v2_vehicle_odometer_logs
  add constraint v2_vehicle_odometer_nonnegative_chk check (odometer_km is null or odometer_km >= 0) not valid;
alter table public.v2_vehicle_odometer_logs validate constraint v2_vehicle_odometer_nonnegative_chk;

alter table public.v2_fuel_logs
  add constraint v2_fuel_odometer_nonnegative_chk check (odometer_km is null or odometer_km >= 0) not valid;
alter table public.v2_fuel_logs validate constraint v2_fuel_odometer_nonnegative_chk;

alter table public.v2_poultry_truck_loads
  add constraint v2_poultry_truck_birds_nonnegative_chk check (birds is null or birds >= 0) not valid;
alter table public.v2_poultry_truck_loads validate constraint v2_poultry_truck_birds_nonnegative_chk;

alter table public.v2_ppe_deliveries
  add constraint v2_ppe_quantity_positive_chk check (quantity > 0) not valid;
alter table public.v2_ppe_deliveries validate constraint v2_ppe_quantity_positive_chk;

alter table public.v2_work_orders
  add constraint v2_work_orders_amounts_nonnegative_chk check (
    coalesce(labor_amount,0) >= 0 and coalesce(parts_amount,0) >= 0 and coalesce(total_amount,0) >= 0
  ) not valid;
alter table public.v2_work_orders validate constraint v2_work_orders_amounts_nonnegative_chk;

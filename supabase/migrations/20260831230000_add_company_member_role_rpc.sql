create or replace function public.update_company_member_role(p_user_id uuid, p_role text)
returns boolean language plpgsql security definer set search_path=''
as $$ declare v_company_id uuid; v_admin_count integer;
begin
  if p_role not in ('admin','member') then raise exception 'Cargo inválido'; end if;
  select company_id into v_company_id from public.company_members where user_id=(select auth.uid()) limit 1;
  if v_company_id is null or not private.is_company_admin(v_company_id) then raise exception 'Somente administradores podem alterar cargos'; end if;
  if not exists(select 1 from public.company_members where company_id=v_company_id and user_id=p_user_id) then raise exception 'Membro não encontrado'; end if;
  if p_role='member' and exists(select 1 from public.companies where id=v_company_id and created_by=p_user_id) then raise exception 'O proprietário deve permanecer administrador'; end if;
  if p_role='member' then
    select count(*) into v_admin_count from public.company_members where company_id=v_company_id and role='admin';
    if v_admin_count<=1 and exists(select 1 from public.company_members where company_id=v_company_id and user_id=p_user_id and role='admin') then raise exception 'A empresa precisa manter um administrador'; end if;
  end if;
  update public.company_members set role=p_role where company_id=v_company_id and user_id=p_user_id; return true;
end; $$;
revoke all on function public.update_company_member_role(uuid,text) from public,anon;
grant execute on function public.update_company_member_role(uuid,text) to authenticated;

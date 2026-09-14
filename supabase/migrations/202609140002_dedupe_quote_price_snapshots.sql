create or replace function private.capture_quote_price_snapshot() returns trigger language plpgsql security definer set search_path='' as $$
declare q public.quotes; ti public.tender_items; raw_name text; normalized text; normalized_unit text; fingerprint text; catalog_id uuid; validity integer;
begin
 select * into q from public.quotes where id=new.quote_id; select * into ti from public.tender_items where id=new.tender_item_id;
 raw_name=coalesce(nullif(trim(new.supplier_description),''),ti.description,'Item sem descrição');
 normalized=trim(regexp_replace(regexp_replace(lower(raw_name),'[^a-z0-9]+',' ','g'),'\\s+',' ','g'));
 normalized_unit=private.normalize_quote_unit(ti.unit); fingerprint=normalized||'|'||coalesce(normalized_unit,'');
 select id into catalog_id from public.catalog_products where company_id=q.company_id and specification_fingerprint=fingerprint;
 if catalog_id is null then insert into public.catalog_products(company_id,name,normalized_name,normalized_unit,specification_fingerprint) values(q.company_id,raw_name,normalized,normalized_unit,fingerprint) returning id into catalog_id; end if;
 select quote_validity_days into validity from public.company_quote_settings where company_id=q.company_id; validity=coalesce(validity,20);
 if exists(select 1 from public.quote_price_snapshots where company_id=q.company_id and product_id=catalog_id and supplier_id=q.supplier_id and unit_price=new.unit_price) then return new; end if;
 insert into public.quote_price_snapshots(company_id,product_id,supplier_id,quote_id,source_quote_item_id,tender_id,tender_item_id,original_name,original_description,original_unit,normalized_unit,original_quantity,unit_price,total_price,brand,package_description,source_filename,source_storage_path,quoted_at,expires_at,validity_days_snapshot)
 values(q.company_id,catalog_id,q.supplier_id,q.id,new.id,q.tender_id,new.tender_item_id,raw_name,raw_name,ti.unit,normalized_unit,coalesce(new.available_quantity,ti.quantity),new.unit_price,case when coalesce(new.available_quantity,ti.quantity)>0 then new.unit_price*coalesce(new.available_quantity,ti.quantity) end,new.brand,new.package_description,q.source_filename,q.storage_path,q.created_at,q.created_at+(validity * interval '1 day'),validity);
 return new;
end $$;

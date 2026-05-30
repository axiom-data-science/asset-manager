const UUID = ***REMOVED***1ea5756a-947f-4542-9520-77f66c444a64***REMOVED***
const o = {
  "acdd":`https://stage-asset-docs-postgrest.srv.axds.co/document?uuid=eq.${UUID}&select=id:data-%3E%3Estation-id,infoUrl:data-%3E%3Einfo_url,Conventions:data-%3E%3Econventions,creator_institution:data-%3E%3Ecreator_institution,cdm_data_type:data-%3E%3Ecdm_data_type,contributor_email:data-%3E%3Econtributor_email,contributor_url:data-%3E%3Econtributor_url,contributor_role:data-%3E%3Econtributor_role,contributor_role_vocabulary:data-%3E%3Econtributor_role_vocabulary,creator_country:data-%3E%3Ecreator_country,creator_email:data-%3E%3Ecreator_email,creator_institution:data-%3E%3Ecreator_institution,creator_name:data-%3E%3Ecreator_name,creator_sector:data-%3E%3Ecreator_sector,creator_type:data-%3E%3Ecreator_type,creator_url:data-%3E%3Ecreator_url,Easternmost_Easting:data-%3E%3Elongitude,Westernmost_Easting:data-%3E%3Elongitude,Northernmost_Northing:data-%3E%3Elatitude,Southernmost_Northing:data-%3E%3Elatitude,sourceUrl:data-%3E%3Esource_url,featureType:data-%3E%3Efeature_type,time_coverage_end:data-%3E%3Etime_coverage_end,time_coverage_start:data-%3E%3Etime_coverage_start,geospatial_lat_max:data-%3E%3Elatitude,geospatial_lat_min:data-%3E%3Elatitude,geospatial_lon_max:data-%3E%3Elongitude,geospatial_lon_min:data-%3E%3Elongitude`,
  "sample_file":`https://stage-asset-docs-postgrest.srv.axds.co/document?uuid=eq.${UUID}&select=file_uri:data-%3Esample_file-%3E%3Efile_uri,headers:data-%3Esample_file-%3Eheaders`
}

console.log(o)
const j = await(await fetch(`https://demo-erddapper.srv.axds.co/datasets/${UUID}`,{
    headers:{
        ***REMOVED***Content-Type***REMOVED***:***REMOVED***application/json***REMOVED***,
        ***REMOVED***Accept***REMOVED***: ***REMOVED***application/json***REMOVED***
    },
    body: JSON.stringify(o),
    method: ***REMOVED***POST***REMOVED***
})).json()
console.log(j)
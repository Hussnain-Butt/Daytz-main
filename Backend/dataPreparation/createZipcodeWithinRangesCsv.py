import pandas as pd
import geopandas as gpd
from shapely.geometry import Point
from geopandas.tools import sjoin

# Load the CSV file
df = pd.read_csv('US_zipcodes_longitude_and_latitude.csv')
df['geometry'] = [Point(xy) for xy in zip(df.longitude, df.latitude)]
gdf = gpd.GeoDataFrame(df, geometry='geometry')

# Create a spatial index
gdf.set_crs(epsg=4326, inplace=True)  # Make sure coordinates are in latitude/longitude
gdf = gdf.to_crs(epsg=3857)  # Convert to metric system for distance calculations (meters)
spatial_index = gdf.sindex

# Function to find nearby zip codes within specified meters
def find_nearby_zipcodes(gdf, distance_in_meters):
    gdf['within_distance'] = gdf.geometry.apply(lambda geom: 
        gdf.iloc[list(spatial_index.intersection(geom.buffer(distance_in_meters).bounds))].zipcode.tolist())
    print(f'Found zip codes within {distance_in_meters} meters')
    return gdf

# Helper function to format the list of zip codes as a PostgreSQL array
def format_postgres_array(zip_codes):
    return "{" + ",".join(map(str, zip_codes)) + "}"

# Calculate for 5 miles (8047 meters), 10 miles (16093 meters), and 20 miles (32186 meters)
gdf = find_nearby_zipcodes(gdf, 8047)  # 5 miles in meters
gdf['within_5_miles'] = gdf['within_distance'].apply(format_postgres_array)

gdf = find_nearby_zipcodes(gdf, 16093)  # 10 miles
gdf['within_10_miles'] = gdf['within_distance'].apply(format_postgres_array)

gdf = find_nearby_zipcodes(gdf, 32186)  # 20 miles
gdf['within_20_miles'] = gdf['within_distance'].apply(format_postgres_array)

# Drop temporary columns and unnecessary geometry for CSV output
gdf.drop(columns=['geometry', 'within_distance'], inplace=True)

# Save to CSV
gdf[['zipcode', 'within_5_miles', 'within_10_miles', 'within_20_miles']].to_csv('zipcode_distance_groups.csv', index=False)

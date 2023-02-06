[Example 2. Ulverston & Leven Estuary](https://github.com/NERC-CEH/YMYW/blob/main/Examples/UlverstonLevenEstuary.js)

This example (link above) contains the geometries (multipolygons) and parameters used to classify the Sentinel-2 images and create a land cover map for the region (AOI) around the Leven Estuary near Ulverston (UK) using 13 land cover classes.

- Uses satellite images collection "COPERNICUS/S2_SR" - [Sentinel-2 MSI: MultiSpectral Instrument, Level-2A](https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S2_SR#:~:text=Sentinel%2D2%20is%20a%20wide,data%20are%20downloaded%20from%20scihub.)

- Aims to classify Land Cover of the year 2021 (start date: '2021-01-01').
 
- Divides the year into four periods (seasons) - '0,3:3,6:6,9:9,12'.
   - Period 1 = [2020-01-01 - 2020-04-01] (3 months)
   - Period 2 = [2020-04-01 - 2020-07-01] (3 months)
   - Period 3 = [2020-07-01 - 2020-10-01] (3 months)
   - Period 4 = [2020-10-01 - 2020-12-01] (3 months)
    
- Contains 13 land cover classes in the thematic map.
   - CL1 = Deciduous woodland
   - CL2 = Modified grassland
   - CL3 = Water
   - CL4 = Build up
   - CL5 = Arable
   - CL6 = Coniferous
   - CL7 = Peat bog
   - CL8 = Bracken
   - CL9 = Salt marsh
   - CL10 = Semi-natural grassland
   - CL11 = Coastal sediment
   - CL12 = Sealed surface
   - CL13 = Gorse

1. Copy the JavaScript found in [Example/UlverstonLevenEstuary.js](https://github.com/NERC-CEH/YMYW/blob/main/Examples/UlverstonLevenEstuary.js)
   
2. Paste the Zurich JavaScript into the GEE editor. 

3. Move the mouse pointer over the code and click on "convert" in the yellow field to convert the data into training polygons for this example. 

4. Copy the YMYW JavaScript foun in [YMYW.js](https://github.com/NERC-CEH/YMYW/blob/main/YMYW.js)   

5. Paste the YMYW copied JavaScript below the block with the heading **"// ### YMYW Code Below >>>"**  (line 33 in the GEE editor). 

6. Press the "Run" button at the top of the GEE editor.

7. In the interactive GUI panel that appears on the left, check the parameters used to select the satellite images and set the year and time periods for creating the composite images.   

8. Click on "View composites" in the GUI panel and select them from the "Layers" menu (top right of the map). View and explore the five seasonal layers.   

9.  Click on "Classify" in the GUI panel to start the Random Forest classifier and classify the AOI (blue square). This may take some time (do not worry if you see the message "Page Unresponsive").     

10. Once the process is complete, the Land Cover legend appears at the bottom right of the screen and the classification is displayed. For large area, rendering can take some time. You can select or deselect the classification from the Layers menu.

11. You can now compute the statistics "Out of bag error" and "Variable importance" for the Random Forest model from GUI menu and examine the output in the console panel.

12. Click on "Validate classification" in the GUI menu to calculate the confusion matrix and the omission and commission errors. 

13. Check the results (i.e. the confusion matrix etc.) in the console panel (top right, next to the editor).

14. Click on "Export classification and more" to export the classification map, training and validation data and more to Google Drive or Google Cloud.

15. Navigate to the "Tasks" tab in the top right panel (the tab should now be orange). Click Run and follow the instructions to start the export.

    - Export objects
    - layers = polygons (KML) drawn to inform the classification;
    - trainingPoints = points (KML) used to train the Random Forest classifier;
    - validationPoints = points (KML) used to validate the classification (cross-validation);
    - ErrorMatrix = Confusion matrix (CSV) from the cross-validation;
    - classified_aoi = Classified map (GeoTIFF) of the Area of Interest;
    - composite_aoi = Composite image (GeoTIFF) with the bands for each period and the terrain layers (elevation, slope, aspect).

[back to YMYW](https://github.com/NERC-CEH/YMYW/)
[Example 2. Ulverston & Leven Estuary](https://github.com/NERC-CEH/YMYW/blob/main/Examples/UlverstonLevenEstuary.js)

This example (link above) presents the geometries (Multipolygons) and parameters used to classify the Sentinel-2 images and produce a land cover map for the region (AOI) around the Leven Estuary near Ulverston (UK). 

- Uses satellite images collection "COPERNICUS/S2_SR" - [Sentinel-2 MSI: MultiSpectral Instrument, Level-2A](https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S2_SR#:~:text=Sentinel%2D2%20is%20a%20wide,data%20are%20downloaded%20from%20scihub.)

- Aims to classify Land Cover of the year 2021 (start date: '2021-01-01')
 
- Divides the year into four periods (seasons) '0,3:3,6:6,9:9,12'
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

1. Copy the code in [Example/UlverstonLevenEstuary.js](https://github.com/NERC-CEH/YMYW/blob/main/Examples/UlverstonLevenEstuary.js)  
2. Paste the Zurich code in the GEE editor.  

3. Hover over the code with the mouse and press "convert" in the yellow box to convert the records into training polygons for this example.  

4. Copy the YMYW code in [YMYW.js](https://github.com/NERC-CEH/YMYW/blob/main/YMYW.js)   

5. Paste the YMYW code below the block entitled **"// ### YMYW Code Below >>>"** (line 33 in GEE editor).   

6. Press "Run" (run script) at the top of the GEE editor.

7. On the interactive GUI panel that appears on the left-hand side, examine the parameters that will be used to select the satellite images and define the year and the periods to create the composite images.   

8. On the GUI panel, press "Show Composites" and select them from the layers menu (top-right side of the map); Examine the five seasonal layers.   

9. On the GUI panel, press "Classify" to the Random Forest classifier and classify the AOI (blue square). This can take some time (do not worry if you see the message "Page Unresponsive).     

10. Once completed, the Land Cover legend will appear on the bottom right of the screen, and the classification will be rendered. You can select or deselect the classification from the layers menu.

11. You can now explore the "Out of bag error" and the "Variable importance" statistics for the Random Forest model on the GUI menu.

12. Press "Validate classification" on the GUI menu to compute the confusion matrix and omission and commission errors.   

13. Examine the outputs (i.e. confusion matrix, etc.) from the GEE console (top-right panel, next to the editor).

14. Press "Export classification and more" to export the classification map, the training data and validation data, and more to Google drive or Google cloud.

15. Navigate to the "Tasks" tab in the top-right panel (the tab should be orange now) and Run and follow the instructions to launch the export.

    - Export objects
    - layers = polygons (KML) drawn to inform the classification;
    - trainingPoints = points (KML) used to train the Random Forest classifier;
    - validationPoints = points (KML) used to validate the classification (cross-validation);
    - ErrorMatrix = Confusion matrix (CSV) from the cross-validation;
    - classified_aoi = Classified map (GeoTIFF) of the Area of Interest;
    - composite_aoi = Composite image (GeoTIFF) with the bands for each period and the terrain layers (elevation, slope, aspect).
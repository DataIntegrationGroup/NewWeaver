import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SitePage } from "./SitePage"

export function Help() {
  return (
    <SitePage>
      <div className="space-y-6" data-testid="help-page">
        <h1 className="!text-4xl text-primary">Documentation &amp; Help</h1>
        <p className="text-muted-foreground">
          How to use Weaver, where its data comes from, and the terms under which
          it is provided.
        </p>

        <Tabs defaultValue="using" className="mt-2">
          <TabsList>
            <TabsTrigger value="using">Using the map</TabsTrigger>
            <TabsTrigger value="sources">Data sources</TabsTrigger>
            <TabsTrigger value="disclaimer">Disclaimer</TabsTrigger>
          </TabsList>

          <TabsContent value="using" className="space-y-4 pt-4">
            <h2 className="!text-2xl text-primary">Using the map</h2>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                <strong>Layers.</strong> Use the sidebar to toggle data layers on
                and off. Each layer is a monitoring network or an integrated
                dataset.
              </li>
              <li>
                <strong>Monitoring points.</strong> Click a point to open its
                panel, choose a datastream, and view a time-series chart of its
                observations.
              </li>
              <li>
                <strong>Vector features.</strong> Click a feature to inspect its
                attributes, or open the <em>Attribute table</em> to browse, sort,
                and page through a layer.
              </li>
              <li>
                <strong>Filter.</strong> Restrict data to the current map extent
                with “Filter to map view,” or type in the feature filter to match
                attributes.
              </li>
              <li>
                <strong>Share.</strong> The visible layers, map extent, and
                selection are encoded in the page URL — copy it to share the exact
                view.
              </li>
            </ul>
          </TabsContent>

          <TabsContent value="sources" className="space-y-4 pt-4">
            <h2 className="!text-2xl text-primary">Data sources</h2>
            <p className="text-muted-foreground">
              Weaver reads public data through two open, standards-based
              interfaces — no source-specific code:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                <strong>OGC API Features</strong> — vector / integrated layers
                published by the Data Integration Engine.
              </li>
              <li>
                <strong>OGC SensorThings API (STA)</strong> — monitoring
                locations and time series from the FROST server, including
                multiple agency networks (e.g. City of Albuquerque, Bernalillo
                County, NM Office of the State Engineer).
              </li>
            </ul>
          </TabsContent>

          <TabsContent value="disclaimer" className="space-y-4 pt-4">
            <h2 className="!text-2xl text-primary">Disclaimer</h2>
            <p className="text-muted-foreground">
              At NMBGMR, we use different tools to collect groundwater level
              measurements, including continuous data recorders and manual
              measurements. All data provided here are in feet, depth to water,
              below ground surface (BGS). We use pressure transducers to record
              pressure of water over a device installed in the well, which is
              converted to feet of water and depth to water. We provide here up to
              one measurement per hour where the data are that frequent. In some
              locations we have more data available. We also use continuous
              acoustic sounder devices which convert a sound reflection into a
              measurement of depth to water. These can be used for long term
              trends in groundwater levels. While we do our best to review and
              quality check these data, please use these data with caution.
              Site-specific conditions should be verified, especially for legally
              binding decisions. Data are subject to changes, deletion, or being
              moved without notice at any time and should not be relied on for any
              critical application. Any opinions expressed may not necessarily
              reflect the official position of the New Mexico Bureau of Geology,
              New Mexico Tech, or the State of New Mexico. No warranty expressed or
              implied, is made regarding the accuracy or utility of the data for
              general or scientific purposes.
            </p>
            <p className="text-muted-foreground">
              This geospatial data is being provided to the public as a resource
              to aid in the understanding of the resources of New Mexico. However,
              there are limitations for all data, particularly when aggregated
              with other data that may have been collected at different times, by
              different agencies or people, and for different purposes. All
              geospatial data sets are inherently scale-dependent and may falsely
              imply relationships with other data or a false level of accuracy
              when zoomed-in beyond the scale of analysis. Users of this data
              should carefully read the included metadata for each data set.
              Site-specific conditions should also be verified, especially for
              legally binding decisions. Users are also welcome to contact us for
              clarification regarding the strengths and limitations of our data.
            </p>
          </TabsContent>
        </Tabs>
      </div>
    </SitePage>
  )
}

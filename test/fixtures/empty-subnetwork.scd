<?xml version="1.0" encoding="UTF-8"?>
<SCL xmlns="http://www.iec.ch/61850/2003/SCL" version="2007" revision="B" release="4">
  <Header id="test-empty-subnetwork"/>
  <Substation name="S1">
    <VoltageLevel name="V1">
      <Bay name="B1"/>
    </VoltageLevel>
  </Substation>
  <Communication>
    <SubNetwork name="StationBus" type="8-MMS">
      <BitRate unit="b/s" multiplier="M">100</BitRate>
      <ConnectedAP iedName="IED1" apName="AP1"/>
      <ConnectedAP iedName="IED2" apName="AP1"/>
    </SubNetwork>
  </Communication>
  <IED name="IED1" manufacturer="OpenSCD">
    <AccessPoint name="AP1">
      <Server>
        <Authentication/>
        <LDevice inst="LD1">
          <LN0 lnClass="LLN0" inst="" lnType="LLN0_Test"/>
        </LDevice>
      </Server>
    </AccessPoint>
  </IED>
  <IED name="IED2" manufacturer="OpenSCD">
    <AccessPoint name="AP1">
      <Server>
        <Authentication/>
        <LDevice inst="LD2">
          <LN0 lnClass="LLN0" inst="" lnType="LLN0_Test"/>
        </LDevice>
      </Server>
    </AccessPoint>
  </IED>
  <DataTypeTemplates>
    <LNodeType lnClass="LLN0" id="LLN0_Test">
      <DO name="Beh" type="Beh_Test"/>
    </LNodeType>
    <DOType cdc="ENS" id="Beh_Test">
      <DA name="stVal" fc="ST" dchg="true" bType="Enum" type="stVal_enums"/>
    </DOType>
    <EnumType id="stVal_enums">
      <EnumVal ord="1">on</EnumVal>
    </EnumType>
  </DataTypeTemplates>
</SCL>

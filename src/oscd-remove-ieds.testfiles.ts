export const testDocs = {
  communicationChoices: `<?xml version="1.0" encoding="UTF-8"?>
<SCL xmlns="http://www.iec.ch/61850/2003/SCL" version="2007" revision="B" release="4">
  <Header id="communication-choices"/>
  <Communication desc="Preserve network engineering data">
    <Private type="engineering" xmlns:eng="urn:example:engineering">
      <eng:Note>Communication metadata</eng:Note>
      <SubNetwork name="PrivateEmpty"/>
    </Private>
    <SubNetwork name="StationBus" type="8-MMS">
      <Private type="engineering" xmlns:eng="urn:example:engineering">
        <eng:Note>StationBus metadata</eng:Note>
      </Private>
      <BitRate unit="b/s" multiplier="M">100</BitRate>
      <ConnectedAP iedName="IED1" apName="AP1"/>
      <ConnectedAP iedName="IED1" apName="AP2"/>
      <ConnectedAP iedName="IED2" apName="AP1"/>
    </SubNetwork>
    <SubNetwork name="ProcessBus" type="8-MMS">
      <BitRate unit="b/s" multiplier="M">1000</BitRate>
      <ConnectedAP iedName="IED2" apName="AP2"/>
      <ConnectedAP iedName="IED3" apName="AP1"/>
    </SubNetwork>
  </Communication>
  <IED name="IED1"><AccessPoint name="AP1"/><AccessPoint name="AP2"/></IED>
  <IED name="IED2"><AccessPoint name="AP1"/><AccessPoint name="AP2"/></IED>
  <IED name="IED3"><AccessPoint name="AP1"/></IED>
</SCL>`,

  multipleIEDs: `<?xml version="1.0" encoding="UTF-8"?>
<SCL xmlns="http://www.iec.ch/61850/2003/SCL" version="2007" revision="B" release="4">
  <Header id="test-remove-ieds"/>
  <Substation name="S1">
    <VoltageLevel name="V1">
      <Bay name="B1"/>
    </VoltageLevel>
  </Substation>
  <Communication>
    <SubNetwork name="StationBus" type="8-MMS">
      <BitRate unit="b/s" multiplier="M">100</BitRate>
      <ConnectedAP iedName="PUB_A" apName="AP1">
        <GSE ldInst="LD_A" cbName="GCB_A">
          <MinTime unit="s" multiplier="m">10</MinTime>
          <MaxTime unit="s" multiplier="m">1000</MaxTime>
        </GSE>
      </ConnectedAP>
      <ConnectedAP iedName="SUB_A" apName="AP1"/>
    </SubNetwork>
  </Communication>
  <IED name="PUB_A" manufacturer="ABB" type="REL670" desc="Publisher A" configVersion="1.0" originalSclVersion="2007" originalSclRevision="B" originalSclRelease="4">
    <AccessPoint name="AP1">
      <Server>
        <Authentication/>
        <LDevice inst="LD_A">
          <LN0 lnClass="LLN0" inst="" lnType="LLN0_Test">
            <DataSet name="DS_A">
              <FCDA ldInst="LD_A" prefix="" lnClass="TCTR" lnInst="1" doName="Beh" daName="stVal" fc="ST"/>
            </DataSet>
            <GSEControl name="GCB_A" type="GOOSE" appID="0001" confRev="1" datSet="DS_A"/>
          </LN0>
        </LDevice>
      </Server>
    </AccessPoint>
  </IED>
  <IED name="SUB_A" manufacturer="Siemens" type="7SJ85">
    <AccessPoint name="AP1">
      <Server>
        <Authentication/>
        <LDevice inst="LD_SUB_A">
          <LN0 lnClass="LLN0" inst="" lnType="LLN0_Test">
            <Inputs>
              <ExtRef iedName="PUB_A" serviceType="GOOSE" ldInst="LD_A" prefix="" lnClass="TCTR" lnInst="1" doName="Beh" daName="stVal" srcLDInst="LD_A" srcLNClass="LLN0" srcCBName="GCB_A"/>
            </Inputs>
          </LN0>
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
      <DA name="q" fc="ST" qchg="true" bType="Quality"/>
      <DA name="t" fc="ST" bType="Timestamp"/>
    </DOType>
    <EnumType id="stVal_enums">
      <EnumVal ord="1">on</EnumVal>
      <EnumVal ord="2">blocked</EnumVal>
    </EnumType>
  </DataTypeTemplates>
</SCL>`,

  singleIED: `<?xml version="1.0" encoding="UTF-8"?>
<SCL xmlns="http://www.iec.ch/61850/2003/SCL" version="2007" revision="B" release="4">
  <Header id="test-single-ied"/>
  <Substation name="S1">
    <VoltageLevel name="V1">
      <Bay name="B1"/>
    </VoltageLevel>
  </Substation>
  <IED name="IED1" manufacturer="OpenSCD" type="Virtual" desc="Test IED">
    <AccessPoint name="AP1">
      <Server>
        <Authentication/>
        <LDevice inst="LD1">
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
</SCL>`,

  noIEDs: `<?xml version="1.0" encoding="UTF-8"?>
<SCL xmlns="http://www.iec.ch/61850/2003/SCL" version="2007" revision="B" release="4">
  <Header id="test-no-ieds"/>
  <Substation name="S1">
    <VoltageLevel name="V1">
      <Bay name="B1"/>
    </VoltageLevel>
  </Substation>
  <DataTypeTemplates>
    <LNodeType lnClass="LLN0" id="LLN0_Test">
      <DO name="Beh" type="Beh_Test"/>
    </LNodeType>
  </DataTypeTemplates>
</SCL>`,

  /**
   * Reproduces the empty SubNetwork issue from sample.scd:
   * Removing all IEDs leaves an empty SubNetwork with no ConnectedAP children,
   * which violates the SCL schema (SubNetwork requires at least one ConnectedAP).
   */
  emptySubNetwork: `<?xml version="1.0" encoding="UTF-8"?>
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
</SCL>`,

  /**
   * Reproduces the duplicate LNode issue from sample2.scd:
   * When multiple IEDs are removed, removeIED sets their LNode iedName to "None".
   * If multiple LNodes within the same ConductingEquipment/Function originally
   * pointed to different IEDs but share the same lnClass/lnInst/ldInst/prefix,
   * they become duplicates violating uniqueLNodeInFuncForCE.
   */
  duplicateLNodes: `<?xml version="1.0" encoding="UTF-8"?>
<SCL xmlns="http://www.iec.ch/61850/2003/SCL" version="2007" revision="B" release="4">
  <Header id="test-duplicate-lnodes"/>
  <Substation name="S1">
    <VoltageLevel name="V1">
      <Bay name="B1">
        <ConductingEquipment name="QA1" type="CBR">
          <LNode iedName="IED1" ldInst="CBSW" lnClass="XCBR" lnInst="1" lnType="XCBR_Test"/>
          <LNode iedName="IED2" ldInst="CBSW" lnClass="XCBR" lnInst="1" lnType="XCBR_Test"/>
          <LNode iedName="IED1" ldInst="CB" lnClass="CSWI" lnInst="1" lnType="CSWI_Test"/>
          <LNode iedName="IED2" ldInst="CB" lnClass="CSWI" lnInst="1" lnType="CSWI_Test"/>
          <LNode iedName="IED1" ldInst="CB" lnClass="CILO" lnInst="1" lnType="CILO_Test"/>
          <LNode iedName="IED2" ldInst="CB" lnClass="CILO" lnInst="1" lnType="CILO_Test"/>
          <LNode iedName="None" ldInst="CBSW" lnClass="XCBR" lnInst="1" lnType="XCBR_Test"/>
          <LNode iedName="None" ldInst="CB" lnClass="CSWI" lnInst="2" lnType="CSWI_Test"/>
        </ConductingEquipment>
      </Bay>
    </VoltageLevel>
  </Substation>
  <IED name="IED1" manufacturer="VendorA">
    <AccessPoint name="AP1">
      <Server>
        <Authentication/>
        <LDevice inst="CBSW">
          <LN0 lnClass="LLN0" inst="" lnType="LLN0_Test"/>
          <LN lnClass="XCBR" inst="1" lnType="XCBR_Test"/>
        </LDevice>
        <LDevice inst="CB">
          <LN0 lnClass="LLN0" inst="" lnType="LLN0_Test"/>
          <LN lnClass="CSWI" inst="1" lnType="CSWI_Test"/>
          <LN lnClass="CILO" inst="1" lnType="CILO_Test"/>
        </LDevice>
      </Server>
    </AccessPoint>
  </IED>
  <IED name="IED2" manufacturer="VendorB">
    <AccessPoint name="AP1">
      <Server>
        <Authentication/>
        <LDevice inst="CBSW">
          <LN0 lnClass="LLN0" inst="" lnType="LLN0_Test"/>
          <LN lnClass="XCBR" inst="1" lnType="XCBR_Test"/>
        </LDevice>
        <LDevice inst="CB">
          <LN0 lnClass="LLN0" inst="" lnType="LLN0_Test"/>
          <LN lnClass="CSWI" inst="1" lnType="CSWI_Test"/>
          <LN lnClass="CILO" inst="1" lnType="CILO_Test"/>
        </LDevice>
      </Server>
    </AccessPoint>
  </IED>
  <DataTypeTemplates>
    <LNodeType lnClass="LLN0" id="LLN0_Test">
      <DO name="Beh" type="Beh_Test"/>
    </LNodeType>
    <LNodeType lnClass="XCBR" id="XCBR_Test">
      <DO name="Beh" type="Beh_Test"/>
      <DO name="Pos" type="DPC_Test"/>
    </LNodeType>
    <LNodeType lnClass="CSWI" id="CSWI_Test">
      <DO name="Beh" type="Beh_Test"/>
      <DO name="Pos" type="DPC_Test"/>
    </LNodeType>
    <LNodeType lnClass="CILO" id="CILO_Test">
      <DO name="Beh" type="Beh_Test"/>
      <DO name="EnaOpn" type="SPS_Test"/>
    </LNodeType>
    <DOType cdc="ENS" id="Beh_Test">
      <DA name="stVal" fc="ST" dchg="true" bType="Enum" type="stVal_enums"/>
    </DOType>
    <DOType cdc="DPC" id="DPC_Test">
      <DA name="stVal" fc="ST" dchg="true" bType="Dbpos"/>
    </DOType>
    <DOType cdc="SPS" id="SPS_Test">
      <DA name="stVal" fc="ST" dchg="true" bType="BOOLEAN"/>
    </DOType>
    <EnumType id="stVal_enums">
      <EnumVal ord="1">on</EnumVal>
    </EnumType>
  </DataTypeTemplates>
</SCL>`,
};

export function parseDoc(xml: string): XMLDocument {
  return new DOMParser().parseFromString(xml, 'application/xml');
}

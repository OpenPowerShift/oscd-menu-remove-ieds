<?xml version="1.0" encoding="UTF-8"?>
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
</SCL>
